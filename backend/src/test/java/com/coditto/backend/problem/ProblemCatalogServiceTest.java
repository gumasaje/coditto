package com.coditto.backend.problem;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Consumer;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ProblemCatalogServiceTest {
    private static final String CANDIDATE_PATH = "src/main/java/example/Candidate.java";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @TempDir
    Path temporaryDirectory;

    @Test
    void loads_json_manifests_once_and_uses_latest_versions_in_id_order() throws Exception {
        createProblem("zeta-problem", 1, manifest -> {}, "zeta-v1");
        Path alphaV1 = createProblem("alpha-problem", 1, manifest -> {}, "alpha-v1");
        createProblem("alpha-problem", 2, manifest -> {}, "alpha-v2");

        ProblemCatalogService service = service();

        Assertions.assertThat(service.catalog().problems())
                .extracting(ProblemCatalogResponse.ProblemSummary::id)
                .containsExactly("alpha-problem", "zeta-problem");
        Assertions.assertThat(service.latestDetail("alpha-problem")).get()
                .extracting(ProblemDetailResponse::version, ProblemDetailResponse::statement)
                .containsExactly(2, "alpha-v2");
        Assertions.assertThat(service.resolve("alpha-problem", 1)).get()
                .extracting(PublishedProblem::version)
                .isEqualTo(1);
        Assertions.assertThat(service.resolve("alpha-problem", null)).get()
                .extracting(PublishedProblem::version)
                .isEqualTo(2);
        Assertions.assertThat(service.resolveInterview("alpha-problem", 1)).get()
                .extracting(
                        InterviewProblem::version,
                        InterviewProblem::allowedPath,
                        InterviewProblem::statement,
                        InterviewProblem::baseContent)
                .containsExactly(1, CANDIDATE_PATH, "alpha-v1", "class Candidate {}");
        Assertions.assertThat(service.resolveInterview("alpha-problem", null)).get()
                .extracting(InterviewProblem::version, InterviewProblem::statement)
                .containsExactly(2, "alpha-v2");

        deleteRecursively(alphaV1);
        Assertions.assertThat(service.resolve("alpha-problem", 1)).isPresent();
        Assertions.assertThat(service.latestDetail("alpha-problem")).get()
                .extracting(ProblemDetailResponse::statement)
                .isEqualTo("alpha-v2");
    }

    @Test
    void excludes_invalid_packages_without_hiding_valid_ones() throws Exception {
        createProblem("valid-problem", 1, manifest -> {}, "valid");

        Path malformed = problemVersion("malformed-problem", 1);
        createDirectoriesAndSource(malformed, CANDIDATE_PATH, "source");
        Files.writeString(malformed.resolve("statement.md"), "statement");
        Files.writeString(malformed.resolve("manifest.yaml"), "schemaVersion: draft-v0");

        Path trailingJson = createProblem("trailing-json", 1, manifest -> {}, "statement");
        Files.writeString(trailingJson.resolve("manifest.yaml"), "{} {}");

        createProblem("identity-problem", 1,
                manifest -> manifest.withObject("problem").put("id", "different-problem"), "statement");
        createProblem("invalid-schema", 1,
                manifest -> manifest.put("schemaVersion", "future-v1"), "statement");
        createProblem("missing-catalog", 1, manifest -> manifest.remove("catalog"), "statement");
        createProblem("invalid-catalog-type", 1,
                manifest -> manifest.withObject("catalog").put("estimatedMinutes", "ten"), "statement");
        createProblem("invalid-display-type", 1,
                manifest -> manifest.withObject("display").put("files", CANDIDATE_PATH), "statement");
        createProblem("multiple-candidate-paths", 1,
                manifest -> manifest.withObject("candidate").withArray("allowedPaths").add("other.java"),
                "statement");
        createProblem("unsafe-path", 1, manifest -> {
            manifest.withObject("display").withArray("files").set(0, objectMapper.getNodeFactory().textNode("../secret"));
            manifest.withObject("candidate").withArray("allowedPaths")
                    .set(0, objectMapper.getNodeFactory().textNode("../secret"));
        }, "statement");
        Path missingFile = createProblem("missing-file", 1, manifest -> {}, "statement");
        Files.delete(missingFile.resolve("base").resolve(CANDIDATE_PATH));
        createProblem("oversized-file", 1, manifest -> {}, "statement", "x".repeat(64 * 1024 + 1));

        ProblemCatalogService service = service();

        Assertions.assertThat(service.catalog().problems())
                .extracting(ProblemCatalogResponse.ProblemSummary::id)
                .containsExactly("valid-problem");
        for (String excluded : List.of(
                "malformed-problem",
                "trailing-json",
                "identity-problem",
                "invalid-schema",
                "missing-catalog",
                "invalid-catalog-type",
                "invalid-display-type",
                "multiple-candidate-paths",
                "unsafe-path",
                "missing-file",
                "oversized-file")) {
            Assertions.assertThat(service.latestDetail(excluded)).isEmpty();
        }
    }

    @Test
    void excludes_symlinks_and_serialized_details_over_256_kib() throws Exception {
        Path symlinkProblem = createProblem("symlink-problem", 1, manifest -> {}, "statement");
        Path candidate = symlinkProblem.resolve("base").resolve(CANDIDATE_PATH);
        Path outside = temporaryDirectory.resolve("outside.java");
        Files.writeString(outside, "outside");
        Files.delete(candidate);
        Files.createSymbolicLink(candidate, outside);

        createLargeDetailProblem();

        ProblemCatalogService service = service();

        Assertions.assertThat(service.catalog().problems()).isEmpty();
        Assertions.assertThat(service.latestDetail("symlink-problem")).isEmpty();
        Assertions.assertThat(service.latestDetail("large-detail")).isEmpty();
    }

    @Test
    void starts_with_an_empty_catalog_when_the_root_is_missing() {
        ProblemCatalogService service = new ProblemCatalogService(
                new ProblemProperties(temporaryDirectory.resolve("missing").toString()), objectMapper);

<<<<<<< Updated upstream
        Assertions.assertThat(service.catalog().categories()).containsExactly("Backend");
=======
        Assertions.assertThat(service.catalog().categories()).containsExactly("Backend", "Data·AI");
>>>>>>> Stashed changes
        Assertions.assertThat(service.catalog().problems()).isEmpty();
    }

    private ProblemCatalogService service() {
        return new ProblemCatalogService(new ProblemProperties(temporaryDirectory.toString()), objectMapper);
    }

    private Path createProblem(
            String id,
            int version,
            Consumer<ObjectNode> manifestChange,
            String statement) throws Exception {
        return createProblem(id, version, manifestChange, statement, "class Candidate {}");
    }

    private Path createProblem(
            String id,
            int version,
            Consumer<ObjectNode> manifestChange,
            String statement,
            String source) throws Exception {
        Path versionDirectory = problemVersion(id, version);
        createDirectoriesAndSource(versionDirectory, CANDIDATE_PATH, source);
        Files.writeString(versionDirectory.resolve("statement.md"), statement);
        ObjectNode manifest = manifest(id, version, List.of(CANDIDATE_PATH));
        manifestChange.accept(manifest);
        Files.writeString(versionDirectory.resolve("manifest.yaml"), objectMapper.writeValueAsString(manifest));
        return versionDirectory;
    }

    private void createLargeDetailProblem() throws Exception {
        String id = "large-detail";
        Path versionDirectory = problemVersion(id, 1);
        List<String> paths = List.of(
                CANDIDATE_PATH,
                "src/main/java/example/Context1.java",
                "src/main/java/example/Context2.java",
                "src/main/java/example/Context3.java",
                "src/main/java/example/Context4.java");
        for (String path : paths) {
            createDirectoriesAndSource(versionDirectory, path, "x".repeat(60 * 1024));
        }
        Files.writeString(versionDirectory.resolve("statement.md"), "statement");
        Files.writeString(
                versionDirectory.resolve("manifest.yaml"),
                objectMapper.writeValueAsString(manifest(id, 1, paths)));
    }

    private ObjectNode manifest(String id, int version, List<String> displayPaths) {
        ObjectNode manifest = objectMapper.createObjectNode();
        manifest.put("schemaVersion", "draft-v0");
        manifest.putObject("problem").put("id", id).put("version", version);
        manifest.putObject("catalog")
                .put("title", "Title")
                .put("category", "Backend")
                .put("stack", "Java")
                .put("bugType", "State")
                .put("estimatedMinutes", 10)
                .put("difficulty", "EASY");
        ArrayNode files = manifest.putObject("display").putArray("files");
        displayPaths.forEach(files::add);
        manifest.putObject("runtime").put("image", "example/image:test");
        manifest.putObject("candidate")
                .putArray("allowedPaths").add(CANDIDATE_PATH);
        manifest.withObject("candidate").put("maxFiles", 1).put("maxBytes", 16384);
        return manifest;
    }

    private Path problemVersion(String id, int version) throws IOException {
        Path versionDirectory = temporaryDirectory.resolve(id).resolve("v" + version);
        Files.createDirectories(versionDirectory);
        return versionDirectory;
    }

    private void createDirectoriesAndSource(Path versionDirectory, String relative, String source) throws IOException {
        Path file = versionDirectory.resolve("base").resolve(relative);
        Files.createDirectories(file.getParent());
        Files.writeString(file, source);
    }

    private void deleteRecursively(Path root) throws IOException {
        try (var paths = Files.walk(root)) {
            for (Path path : paths.sorted((left, right) -> right.compareTo(left)).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }
}
