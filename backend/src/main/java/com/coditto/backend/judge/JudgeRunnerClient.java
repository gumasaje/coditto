package com.coditto.backend.judge;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Service;

@Service
public class JudgeRunnerClient {
    private static final int MAX_RUNNER_STDOUT_BYTES = 64 * 1024;
    private static final Path CANDIDATE_FILE = Path.of(
            "src", "main", "java", "com", "coditto", "demo", "RoleService.java");

    private final RunnerProperties properties;
    private final ObjectMapper objectMapper;
    private final JudgeResponseFactory responseFactory;

    public JudgeRunnerClient(
            RunnerProperties properties,
            ObjectMapper objectMapper,
            JudgeResponseFactory responseFactory) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.responseFactory = responseFactory;
    }

    public JudgeResult judge(SubmissionRequest request) {
        if (request == null || request.source() == null
                || request.source().getBytes(StandardCharsets.UTF_8).length > SubmissionLimits.MAX_SOURCE_BYTES) {
            return responseFactory.rejectedSubmission();
        }

        String containerName = "coditto-api-" + UUID.randomUUID().toString().replace("-", "");
        Process process = null;
        ExecutorService stdoutExecutor = null;
        TemporaryCandidate candidate = null;
        LinkedHashSet<ProcessHandle> knownDescendants = new LinkedHashSet<>();
        boolean interrupted = false;
        JudgeResult result = responseFactory.infrastructureFailure();
        try {
            candidate = TemporaryCandidate.create(request.source());
            Process runnerProcess = startRunner(candidate.directory(), containerName);
            process = runnerProcess;
            AtomicBoolean outputLimitExceeded = new AtomicBoolean(false);
            stdoutExecutor = Executors.newSingleThreadExecutor();
            Future<String> stdout = stdoutExecutor.submit(
                    () -> collectStdout(runnerProcess.getInputStream(), outputLimitExceeded));

            if (waitForRunner(runnerProcess, outputLimitExceeded, knownDescendants)) {
                String output = stdout.get(5, TimeUnit.SECONDS);
                if (!outputLimitExceeded.get()) {
                    JsonNode runnerResult = parseContractJson(output);
                    if (runnerResult != null && hasExpectedExitStatus(runnerProcess.exitValue(), runnerResult)) {
                        result = responseFactory.fromRunner(runnerResult);
                    }
                }
            }
        } catch (InterruptedException exception) {
            interrupted = true;
        } catch (Exception exception) {
            result = responseFactory.infrastructureFailure();
        } finally {
            boolean restoreInterrupted = interrupted || Thread.interrupted();
            boolean processStopped = terminateProcessTree(process, knownDescendants);
            restoreInterrupted = restoreInterrupted || Thread.interrupted();
            if (stdoutExecutor != null) {
                stdoutExecutor.shutdownNow();
            }
            removeJudgeContainer(containerName);
            restoreInterrupted = restoreInterrupted || Thread.interrupted();
            if (candidate != null) {
                try {
                    candidate.close();
                } catch (IOException exception) {
                    result = responseFactory.infrastructureFailure();
                }
            }
            if (!processStopped) {
                result = responseFactory.infrastructureFailure();
            }
            if (restoreInterrupted) {
                Thread.currentThread().interrupt();
            }
        }
        return result;
    }

    private Process startRunner(Path candidateDirectory, String containerName) throws IOException {
        List<String> command = List.of(
                properties.pythonCommand(),
                properties.scriptPath(),
                "--problem-id", JudgeResponseFactory.PROBLEM_ID,
                "--version", Integer.toString(JudgeResponseFactory.VERSION),
                "--candidate", candidateDirectory.toString(),
                "--container-name", containerName);
        return new ProcessBuilder(command)
                // Runner diagnostics can contain build output and are deliberately
                // not forwarded to an API client.
                .redirectError(ProcessBuilder.Redirect.DISCARD)
                .start();
    }

    private boolean waitForRunner(
            Process process,
            AtomicBoolean outputLimitExceeded,
            LinkedHashSet<ProcessHandle> knownDescendants) throws InterruptedException {
        long deadline = System.nanoTime() + timeout().toNanos();
        while (System.nanoTime() < deadline) {
            knownDescendants.addAll(process.toHandle().descendants().toList());
            if (outputLimitExceeded.get()) {
                return false;
            }
            if (process.waitFor(100, TimeUnit.MILLISECONDS)) {
                return !outputLimitExceeded.get();
            }
        }
        return false;
    }

    private String collectStdout(InputStream input, AtomicBoolean outputLimitExceeded) throws IOException {
        try (input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                int remaining = MAX_RUNNER_STDOUT_BYTES - output.size();
                if (read > remaining) {
                    outputLimitExceeded.set(true);
                    if (remaining > 0) {
                        output.write(buffer, 0, remaining);
                    }
                    continue;
                }
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8);
        }
    }

    private Duration timeout() {
        return properties.timeout() == null ? Duration.ofSeconds(75) : properties.timeout();
    }

    private JsonNode parseContractJson(String stdout) {
        String[] lines = stdout.strip().split("\\R", -1);
        if (lines.length != 1 || lines[0].isBlank()) {
            return null;
        }
        try {
            JsonNode value = objectMapper.readTree(lines[0]);
            return isNormalizedContract(value) ? value : null;
        } catch (JsonProcessingException exception) {
            return null;
        }
    }

    private boolean isNormalizedContract(JsonNode value) {
        if (!value.isObject()
                || !hasOnlyFields(value, "schemaVersion", "problem", "runStatus", "check", "error")
                || !hasOnlyFields(value.path("problem"), "id", "version")
                || !value.path("schemaVersion").isTextual()
                || !"draft-v0".equals(value.path("schemaVersion").textValue())
                || !value.path("problem").path("id").isTextual()
                || !JudgeResponseFactory.PROBLEM_ID.equals(value.path("problem").path("id").textValue())
                || !value.path("problem").path("version").isInt()
                || JudgeResponseFactory.VERSION != value.path("problem").path("version").intValue()
                || !value.path("runStatus").isTextual()) {
            return false;
        }
        String runStatus = value.path("runStatus").textValue();
        if ("COMPLETED".equals(runStatus)) {
            JsonNode check = value.path("check");
            return !value.has("error")
                    && hasOnlyFields(value, "schemaVersion", "problem", "runStatus", "check")
                    && hasOnlyFields(check, "id", "execution")
                    && check.path("id").isTextual()
                    && "official".equals(check.path("id").textValue())
                    && check.path("execution").isTextual()
                    && Set.of("TESTS_PASSED", "TESTS_FAILED", "COMPILE_FAILED", "TIMED_OUT", "RESOURCE_LIMITED")
                            .contains(check.path("execution").textValue());
        }
        if ("REJECTED".equals(runStatus)) {
            return isOnlyErrorResult(value, Set.of("INVALID_SUBMISSION"));
        }
        return "SYSTEM_FAILED".equals(runStatus)
                && isOnlyErrorResult(value, Set.of("CONTENT_ERROR", "INFRA_ERROR"));
    }

    private boolean isOnlyErrorResult(JsonNode value, Set<String> allowedKinds) {
        JsonNode error = value.path("error");
        return hasOnlyFields(value, "schemaVersion", "problem", "runStatus", "error")
                && hasOnlyFields(error, "kind")
                && error.path("kind").isTextual()
                && allowedKinds.contains(error.path("kind").textValue());
    }

    private boolean hasExpectedExitStatus(int exitCode, JsonNode result) {
        String runStatus = result.path("runStatus").textValue();
        return ("COMPLETED".equals(runStatus) && exitCode == 0)
                || (("REJECTED".equals(runStatus) || "SYSTEM_FAILED".equals(runStatus)) && exitCode == 2);
    }

    private boolean hasOnlyFields(JsonNode value, String... allowedFields) {
        if (!value.isObject()) {
            return false;
        }
        Set<String> allowed = Set.of(allowedFields);
        var fieldNames = value.fieldNames();
        while (fieldNames.hasNext()) {
            if (!allowed.contains(fieldNames.next())) {
                return false;
            }
        }
        return true;
    }

    private boolean terminateProcessTree(Process process, LinkedHashSet<ProcessHandle> knownDescendants) {
        if (process == null) {
            return knownDescendants.stream().noneMatch(ProcessHandle::isAlive);
        }
        LinkedHashSet<ProcessHandle> handles = new LinkedHashSet<>(knownDescendants);
        handles.addAll(process.toHandle().descendants().toList());
        handles.forEach(ProcessHandle::destroy);
        process.destroy();
        handles.addAll(process.toHandle().descendants().toList());
        waitBrieflyForGracefulExit(process, handles, 200);
        handles.stream().filter(ProcessHandle::isAlive).forEach(ProcessHandle::destroyForcibly);
        process.destroyForcibly();
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline
                && (process.isAlive() || handles.stream().anyMatch(ProcessHandle::isAlive))) {
            try {
                Thread.sleep(25);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return !process.isAlive() && handles.stream().noneMatch(ProcessHandle::isAlive);
    }

    private void waitBrieflyForGracefulExit(Process process, LinkedHashSet<ProcessHandle> handles, long millis) {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(millis);
        while (System.nanoTime() < deadline
                && (process.isAlive() || handles.stream().anyMatch(ProcessHandle::isAlive))) {
            try {
                Thread.sleep(25);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private void removeJudgeContainer(String containerName) {
        try {
            Process cleanup = new ProcessBuilder("docker", "rm", "--force", containerName)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .redirectError(ProcessBuilder.Redirect.DISCARD)
                    .start();
            if (!cleanup.waitFor(10, TimeUnit.SECONDS)) {
                cleanup.destroyForcibly();
            }
        } catch (IOException exception) {
            // A missing Docker CLI/daemon is already surfaced as INFRA_ERROR by the Runner.
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }

    private static final class TemporaryCandidate implements AutoCloseable {
        private final Path directory;

        private TemporaryCandidate(Path directory) {
            this.directory = directory;
        }

        static TemporaryCandidate create(String source) throws IOException {
            Path directory = Files.createTempDirectory("coditto-submission-");
            Path file = directory.resolve(CANDIDATE_FILE);
            Files.createDirectories(file.getParent());
            Files.writeString(file, source, StandardCharsets.UTF_8);
            return new TemporaryCandidate(directory);
        }

        Path directory() {
            return directory;
        }

        @Override
        public void close() throws IOException {
            try (var paths = Files.walk(directory)) {
                paths.sorted((left, right) -> right.compareTo(left)).forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException exception) {
                        throw new TemporaryCleanupException(exception);
                    }
                });
            } catch (TemporaryCleanupException exception) {
                throw exception.getCause();
            }
        }
    }

    private static final class TemporaryCleanupException extends RuntimeException {
        private TemporaryCleanupException(IOException cause) {
            super(cause);
        }

        @Override
        public synchronized IOException getCause() {
            return (IOException) super.getCause();
        }
    }
}
