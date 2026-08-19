package com.coditto.backend.problem;

import com.coditto.backend.judge.SubmissionLimits;
import com.coditto.backend.problem.ProblemCatalogResponse.ProblemSummary;
import com.coditto.backend.problem.ProblemDetailResponse.Candidate;
import com.coditto.backend.problem.ProblemDetailResponse.ProblemFile;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NavigableMap;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ProblemCatalogService {
    public static final List<String> CATEGORIES = List.of("Backend");
    public static final Pattern PROBLEM_ID_PATTERN = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

    private static final Logger LOGGER = LoggerFactory.getLogger(ProblemCatalogService.class);
    private static final Pattern VERSION_DIRECTORY_PATTERN = Pattern.compile("v([1-9][0-9]*)");
    private static final Set<String> DIFFICULTIES = Set.of("EASY", "MEDIUM", "HARD");
    private static final int MAX_DISPLAY_FILE_BYTES = 64 * 1024;
    private static final int MAX_DETAIL_RESPONSE_BYTES = 256 * 1024;

    private final ObjectMapper objectMapper;
    private final NavigableMap<String, NavigableMap<Integer, IndexedProblem>> problems;
    private final ProblemCatalogResponse catalog;

    public ProblemCatalogService(ProblemProperties properties, ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        Path configuredRoot = properties.rootPath() == null
                ? Path.of("../problems")
                : Path.of(properties.rootPath());
        this.problems = loadIndex(configuredRoot.toAbsolutePath().normalize());
        this.catalog = buildCatalog(this.problems);
    }

    public ProblemCatalogResponse catalog() {
        return catalog;
    }

    public Optional<ProblemDetailResponse> latestDetail(String problemId) {
        return latest(problemId).map(IndexedProblem::detail);
    }

    public Optional<PublishedProblem> resolve(String problemId, Integer requestedVersion) {
        NavigableMap<Integer, IndexedProblem> versions = problems.get(problemId);
        if (versions == null || versions.isEmpty()) {
            return Optional.empty();
        }
        IndexedProblem problem = requestedVersion == null
                ? versions.lastEntry().getValue()
                : versions.get(requestedVersion);
        return Optional.ofNullable(problem).map(IndexedProblem::published);
    }

    /**
     * Resolves only data loaded from the public problem package at startup.
     * This deliberately has no filesystem access on the request path.
     */
    public Optional<InterviewProblem> resolveInterview(String problemId, Integer requestedVersion) {
        NavigableMap<Integer, IndexedProblem> versions = problems.get(problemId);
        if (versions == null || versions.isEmpty()) {
            return Optional.empty();
        }
        IndexedProblem problem = requestedVersion == null
                ? versions.lastEntry().getValue()
                : versions.get(requestedVersion);
        return Optional.ofNullable(problem).map(IndexedProblem::interview);
    }

    public static boolean isValidProblemId(String problemId) {
        return problemId != null && PROBLEM_ID_PATTERN.matcher(problemId).matches();
    }

    private Optional<IndexedProblem> latest(String problemId) {
        NavigableMap<Integer, IndexedProblem> versions = problems.get(problemId);
        return versions == null || versions.isEmpty()
                ? Optional.empty()
                : Optional.of(versions.lastEntry().getValue());
    }

    private NavigableMap<String, NavigableMap<Integer, IndexedProblem>> loadIndex(Path root) {
        TreeMap<String, NavigableMap<Integer, IndexedProblem>> loaded = new TreeMap<>();
        if (!Files.isDirectory(root, LinkOption.NOFOLLOW_LINKS)) {
            LOGGER.warn("Problem root is unavailable; starting with an empty catalog: {}", root);
            return Collections.unmodifiableNavigableMap(loaded);
        }

        try (var problemDirectories = Files.list(root)) {
            for (Path problemDirectory : problemDirectories.sorted().toList()) {
                String directoryId = problemDirectory.getFileName().toString();
                if (Files.isSymbolicLink(problemDirectory)) {
                    LOGGER.warn("Excluding symbolic-link problem package: {}", problemDirectory);
                    continue;
                }
                if (!Files.isDirectory(problemDirectory, LinkOption.NOFOLLOW_LINKS)) {
                    continue;
                }
                if (!isValidProblemId(directoryId)) {
                    LOGGER.warn("Excluding problem directory with an invalid slug: {}", problemDirectory);
                    continue;
                }
                loadVersions(problemDirectory, directoryId, loaded);
            }
        } catch (IOException exception) {
            LOGGER.warn("Could not scan problem root {}; keeping the successfully loaded catalog", root, exception);
        }

        TreeMap<String, NavigableMap<Integer, IndexedProblem>> immutable = new TreeMap<>();
        loaded.forEach((id, versions) -> immutable.put(
                id,
                Collections.unmodifiableNavigableMap(new TreeMap<>(versions))));
        return Collections.unmodifiableNavigableMap(immutable);
    }

    private void loadVersions(
            Path problemDirectory,
            String directoryId,
            TreeMap<String, NavigableMap<Integer, IndexedProblem>> loaded) {
        try (var versionDirectories = Files.list(problemDirectory)) {
            for (Path versionDirectory : versionDirectories.sorted().toList()) {
                if (Files.isSymbolicLink(versionDirectory)) {
                    LOGGER.warn("Excluding symbolic-link problem version: {}", versionDirectory);
                    continue;
                }
                if (!Files.isDirectory(versionDirectory, LinkOption.NOFOLLOW_LINKS)) {
                    continue;
                }
                Matcher matcher = VERSION_DIRECTORY_PATTERN.matcher(versionDirectory.getFileName().toString());
                if (!matcher.matches()) {
                    LOGGER.warn("Excluding problem version with an invalid directory name: {}", versionDirectory);
                    continue;
                }
                try {
                    int directoryVersion = Integer.parseInt(matcher.group(1));
                    IndexedProblem problem = loadProblem(versionDirectory, directoryId, directoryVersion);
                    loaded.computeIfAbsent(directoryId, ignored -> new TreeMap<>())
                            .put(directoryVersion, problem);
                } catch (Exception exception) {
                    LOGGER.warn(
                            "Excluding invalid problem package {}: {}",
                            versionDirectory,
                            safeReason(exception));
                }
            }
        } catch (IOException exception) {
            LOGGER.warn("Could not scan versions in {}; excluding this problem", problemDirectory, exception);
        }
    }

    private IndexedProblem loadProblem(Path versionDirectory, String directoryId, int directoryVersion)
            throws IOException {
        Path manifestPath = requireRegularFile(versionDirectory.resolve("manifest.yaml"), "manifest.yaml");
        JsonNode manifest;
        try {
            manifest = objectMapper.reader()
                    .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readTree(readUtf8(manifestPath, MAX_DETAIL_RESPONSE_BYTES));
        } catch (JsonProcessingException exception) {
            throw new InvalidProblemException("manifest.yaml is not valid JSON", exception);
        }
        require(manifest != null && manifest.isObject(), "manifest must be a JSON object");
        requireText(manifest, "schemaVersion", "draft-v0");

        JsonNode identity = requireObject(manifest, "problem", Set.of("id", "version"));
        String id = requireNonBlankText(identity, "id");
        int version = requirePositiveInt(identity, "version");
        require(directoryId.equals(id) && directoryVersion == version,
                "manifest problem identity does not match its directory");

        JsonNode catalogNode = requireObject(
                manifest,
                "catalog",
                Set.of("title", "category", "stack", "bugType", "estimatedMinutes", "difficulty"));
        String title = requireNonBlankText(catalogNode, "title");
        String category = requireNonBlankText(catalogNode, "category");
        require(CATEGORIES.contains(category), "catalog.category is unsupported");
        String stack = requireNonBlankText(catalogNode, "stack");
        String bugType = requireNonBlankText(catalogNode, "bugType");
        int estimatedMinutes = requirePositiveInt(catalogNode, "estimatedMinutes");
        String difficulty = requireNonBlankText(catalogNode, "difficulty");
        require(DIFFICULTIES.contains(difficulty), "catalog.difficulty is unsupported");

        JsonNode display = requireObject(manifest, "display", Set.of("files"));
        List<String> displayPaths = requireStringArray(display, "files");
        require(!displayPaths.isEmpty(), "display.files must not be empty");
        require(new LinkedHashSet<>(displayPaths).size() == displayPaths.size(),
                "display.files must not contain duplicates");

        JsonNode candidateNode = requireObject(
                manifest,
                "candidate",
                Set.of("allowedPaths", "maxFiles", "maxBytes"));
        List<String> allowedPaths = requireStringArray(candidateNode, "allowedPaths");
        require(allowedPaths.size() == 1, "candidate.allowedPaths must contain exactly one path");
        int maxFiles = requirePositiveInt(candidateNode, "maxFiles");
        require(maxFiles == 1, "candidate.maxFiles must equal one");
        int maxBytes = requirePositiveInt(candidateNode, "maxBytes");
        require(maxBytes <= SubmissionLimits.MAX_SOURCE_BYTES,
                "candidate.maxBytes exceeds the API source limit");
        require(displayPaths.contains(allowedPaths.getFirst()),
                "candidate path must be included in display.files");

        Path baseRoot = versionDirectory.resolve("base");
        require(Files.isDirectory(baseRoot, LinkOption.NOFOLLOW_LINKS), "base directory is missing");
        List<ProblemFile> files = new ArrayList<>();
        String candidateBaseContent = null;
        for (String displayPath : displayPaths) {
            Path source = resolveBaseFile(baseRoot, displayPath);
            String content = readUtf8(source, MAX_DISPLAY_FILE_BYTES);
            files.add(new ProblemFile(displayPath, allowedPaths.contains(displayPath), content));
            if (allowedPaths.getFirst().equals(displayPath)) {
                candidateBaseContent = content;
            }
        }
        require(candidateBaseContent != null, "candidate base file is missing");

        String statement = readUtf8(
                requireRegularFile(versionDirectory.resolve("statement.md"), "statement.md"),
                MAX_DETAIL_RESPONSE_BYTES);
        ProblemSummary summary = new ProblemSummary(
                id, version, title, category, stack, bugType, estimatedMinutes, difficulty);
        Candidate candidate = new Candidate(List.copyOf(allowedPaths), maxFiles, maxBytes);
        ProblemDetailResponse detail = new ProblemDetailResponse(
                id,
                version,
                title,
                category,
                difficulty,
                estimatedMinutes,
                statement,
                List.copyOf(files),
                candidate);
        try {
            require(objectMapper.writeValueAsBytes(detail).length <= MAX_DETAIL_RESPONSE_BYTES,
                    "serialized problem detail exceeds 256 KiB");
        } catch (JsonProcessingException exception) {
            throw new InvalidProblemException("problem detail cannot be serialized", exception);
        }
        return new IndexedProblem(
                summary,
                detail,
                new PublishedProblem(id, version, allowedPaths.getFirst(), maxBytes),
                new InterviewProblem(
                        id,
                        version,
                        allowedPaths.getFirst(),
                        maxBytes,
                        statement,
                        candidateBaseContent));
    }

    private ProblemCatalogResponse buildCatalog(
            NavigableMap<String, NavigableMap<Integer, IndexedProblem>> loaded) {
        List<ProblemSummary> summaries = loaded.values().stream()
                .filter(versions -> !versions.isEmpty())
                .map(versions -> versions.lastEntry().getValue().summary())
                .toList();
        return new ProblemCatalogResponse(CATEGORIES, summaries);
    }

    private Path resolveBaseFile(Path baseRoot, String value) throws IOException {
        require(value != null && !value.isBlank() && !value.contains("\\"),
                "display path must be a non-blank POSIX path");
        for (String component : value.split("/", -1)) {
            require(!component.isBlank() && !".".equals(component) && !"..".equals(component),
                    "display path must be a normalized relative path");
        }
        final Path relative;
        try {
            relative = Path.of(value);
        } catch (InvalidPathException exception) {
            throw new InvalidProblemException("display path is invalid", exception);
        }
        require(!relative.isAbsolute() && !relative.startsWith("..") && relative.equals(relative.normalize()),
                "display path must be a normalized relative path");
        Path target = baseRoot.resolve(relative).normalize();
        require(target.startsWith(baseRoot), "display path escapes base directory");

        Path current = baseRoot;
        for (Path component : relative) {
            current = current.resolve(component);
            require(!Files.isSymbolicLink(current), "display path contains a symbolic link");
        }
        return requireRegularFile(target, value);
    }

    private Path requireRegularFile(Path path, String label) {
        require(!Files.isSymbolicLink(path) && Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS),
                label + " must be a regular file");
        return path;
    }

    private String readUtf8(Path path, int limit) throws IOException {
        long size = Files.size(path);
        require(size <= limit, path.getFileName() + " exceeds its byte limit");
        byte[] bytes = Files.readAllBytes(path);
        require(bytes.length <= limit, path.getFileName() + " exceeds its byte limit");
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
        } catch (CharacterCodingException exception) {
            throw new InvalidProblemException(path.getFileName() + " is not valid UTF-8", exception);
        }
    }

    private JsonNode requireObject(JsonNode parent, String field, Set<String> allowedFields) {
        JsonNode value = parent.path(field);
        require(value.isObject(), field + " must be an object");
        value.fieldNames().forEachRemaining(name -> require(
                allowedFields.contains(name), field + " contains an unsupported field"));
        require(value.size() == allowedFields.size(), field + " is missing a required field");
        return value;
    }

    private void requireText(JsonNode parent, String field, String expected) {
        JsonNode value = parent.path(field);
        require(value.isTextual() && expected.equals(value.textValue()), field + " is unsupported");
    }

    private String requireNonBlankText(JsonNode parent, String field) {
        JsonNode value = parent.path(field);
        require(value.isTextual() && !value.textValue().isBlank(), field + " must be a non-blank string");
        return value.textValue();
    }

    private int requirePositiveInt(JsonNode parent, String field) {
        JsonNode value = parent.path(field);
        require(value.isInt() && value.intValue() > 0, field + " must be a positive integer");
        return value.intValue();
    }

    private List<String> requireStringArray(JsonNode parent, String field) {
        JsonNode value = parent.path(field);
        require(value.isArray(), field + " must be an array");
        List<String> values = new ArrayList<>();
        value.forEach(item -> {
            require(item.isTextual() && !item.textValue().isBlank(), field + " must contain non-blank strings");
            values.add(item.textValue());
        });
        return List.copyOf(values);
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new InvalidProblemException(message);
        }
    }

    private String safeReason(Exception exception) {
        return exception instanceof InvalidProblemException && exception.getMessage() != null
                ? exception.getMessage()
                : exception.getClass().getSimpleName();
    }

    private record IndexedProblem(
            ProblemSummary summary,
            ProblemDetailResponse detail,
            PublishedProblem published,
            InterviewProblem interview) {
    }

    private static final class InvalidProblemException extends RuntimeException {
        private InvalidProblemException(String message) {
            super(message);
        }

        private InvalidProblemException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
