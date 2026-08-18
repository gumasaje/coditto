package com.coditto.backend.judge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class SubmissionControllerIntegrationTest {
    private static final Path TEST_RUNNER = Path.of("src", "test", "resources", "test-runner.py")
            .toAbsolutePath();
    private static final Path RUNNER_RECORD = TEST_RUNNER.resolveSibling("runner-record.txt");
    private static final Path RUNNER_INVOKED = TEST_RUNNER.resolveSibling("runner-invoked.txt");

    @Autowired
    private MockMvc mockMvc;

    @DynamicPropertySource
    static void runnerProperties(DynamicPropertyRegistry registry) {
        registry.add("coditto.runner.script-path", TEST_RUNNER::toString);
        registry.add("coditto.runner.timeout", () -> "500ms");
    }

    @AfterEach
    void removeRunnerRecord() throws Exception {
        Files.deleteIfExists(RUNNER_RECORD);
        Files.deleteIfExists(RUNNER_INVOKED);
    }

    @Test
    void returns_the_normalized_runner_result_for_a_single_source_file() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("class RoleService { String updateRole() { return requestedRole; } }")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.check.id").value("official"))
                .andExpect(jsonPath("$.check.execution").value("TESTS_PASSED"));
    }

    @Test
    void returns_suite_results_without_recalculating_execution() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("suites")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.check.execution").value("TESTS_PASSED"))
                .andExpect(jsonPath("$.check.suites.target").value("TESTS_FAILED"))
                .andExpect(jsonPath("$.check.suites.regression").value("TESTS_PASSED"));
    }

    @Test
    void accepts_an_execution_only_compile_failure() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("compile-failed")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.check.execution").value("COMPILE_FAILED"))
                .andExpect(jsonPath("$.check.suites").doesNotExist());
    }

    @Test
    void rejects_invalid_suite_results() throws Exception {
        for (String source : new String[] {
                "invalid-suites-target-value",
                "invalid-suites-regression-value",
                "invalid-suites-missing-target",
                "invalid-suites-non-textual-regression",
                "invalid-suites-extra-field",
                "invalid-suites-non-object"
        }) {
            mockMvc.perform(post("/api/submissions")
                            .contentType("application/json")
                            .content(submissionBody(source)))
                    .andExpect(status().isBadGateway())
                    .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                    .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));
        }
    }

    @Test
    void rejects_runner_stdout_that_is_not_exactly_one_contract_json_line() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("not-json")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));
    }

    @Test
    void maps_a_valid_runner_rejection_to_bad_request() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("rejected")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.runStatus").value("REJECTED"))
                .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"));
    }

    @Test
    void maps_a_valid_runner_system_failure_to_bad_gateway() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("system-failed")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                .andExpect(jsonPath("$.error.kind").value("CONTENT_ERROR"));
    }

    @Test
    void rejects_a_runner_result_with_an_invalid_exit_status_or_json_types() throws Exception {
        for (String source : new String[] {"wrong-exit", "wrong-types", "wrong-problem-identity"}) {
            mockMvc.perform(post("/api/submissions")
                            .contentType("application/json")
                            .content(submissionBody(source)))
                    .andExpect(status().isBadGateway())
                    .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                    .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));
        }
    }

    @Test
    void rejects_runner_stdout_larger_than_the_api_capture_limit_without_blocking() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("oversized-stdout")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));
    }

    @Test
    void returns_infrastructure_failure_when_runner_does_not_finish_before_api_timeout() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("timeout")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));

        String[] record = Files.readString(RUNNER_RECORD).split("\\R");
        Path candidateDirectory = Path.of(record[0]);
        org.assertj.core.api.Assertions.assertThat(Files.exists(candidateDirectory)).isFalse();
        org.assertj.core.api.Assertions.assertThat(record[1]).startsWith("coditto-api-");
    }

    @Test
    void terminates_stubborn_descendants_before_removing_the_candidate_directory() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody("stubborn-descendant")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"));

        String[] record = Files.readString(RUNNER_RECORD).split("\\R");
        Path candidateDirectory = Path.of(record[0]);
        long childPid = Long.parseLong(record[2]);
        org.assertj.core.api.Assertions.assertThat(record).contains("descendant-saw-candidate=True");
        org.assertj.core.api.Assertions.assertThat(Files.exists(candidateDirectory)).isFalse();
        org.assertj.core.api.Assertions.assertThat(ProcessHandle.of(childPid).map(ProcessHandle::isAlive).orElse(false))
                .isFalse();
    }

    @Test
    void rejects_a_request_that_omits_the_single_submission_file() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.runStatus").value("REJECTED"))
                .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"))
                .andExpect(jsonPath("$.problem").doesNotExist());
        org.assertj.core.api.Assertions.assertThat(Files.exists(RUNNER_INVOKED)).isFalse();
    }

    @Test
    void rejects_invalid_or_unknown_problem_identifiers_without_invoking_the_runner() throws Exception {
        for (String body : new String[] {
                "{\"problemId\":\"Role_Update\",\"source\":\"source\"}",
                "{\"problemId\":\"unknown-problem\",\"source\":\"source\"}",
                "{\"problemId\":\"role-update-001\",\"version\":2,\"source\":\"source\"}",
                "{\"problemId\":\"role-update-001\",\"version\":null,\"source\":\"source\"}",
                "{\"problemId\":123,\"source\":\"source\"}"
        }) {
            mockMvc.perform(post("/api/submissions")
                            .contentType("application/json")
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.runStatus").value("REJECTED"))
                    .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"))
                    .andExpect(jsonPath("$.problem").doesNotExist());
            org.assertj.core.api.Assertions.assertThat(Files.exists(RUNNER_INVOKED)).isFalse();
        }
    }

    @Test
    void writes_each_problem_source_to_its_manifest_candidate_path() throws Exception {
        assertRunnerInvocation(
                "member-name-uniqueness-001",
                "src/main/java/com/likelion/springboot/member/service/MemberService.java");
        assertRunnerInvocation(
                "member-list-exposure-001",
                "src/main/java/package2/MemoryMemberRepository.java");
        assertRunnerInvocation(
                "role-update-001",
                "src/main/java/com/coditto/demo/RoleService.java");
    }

    @Test
    void accepts_an_explicit_published_version() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{\"problemId\":\"role-update-001\",\"version\":1,"
                                + "\"source\":\"return requestedRole\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.problem.id").value("role-update-001"))
                .andExpect(jsonPath("$.problem.version").value(1));

        org.assertj.core.api.Assertions.assertThat(Files.readAllLines(RUNNER_INVOKED))
                .containsExactly(
                        "role-update-001",
                        "1",
                        "src/main/java/com/coditto/demo/RoleService.java");
    }

    @Test
    void rejects_source_over_the_published_candidate_limit_without_invoking_the_runner() throws Exception {
        String source = "x".repeat(SubmissionLimits.MAX_SOURCE_BYTES + 1);

        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody(source)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.problem.id").value("role-update-001"))
                .andExpect(jsonPath("$.problem.version").value(1))
                .andExpect(jsonPath("$.runStatus").value("REJECTED"));
        org.assertj.core.api.Assertions.assertThat(Files.exists(RUNNER_INVOKED)).isFalse();
    }

    @Test
    void rejects_malformed_json_without_a_problem_identity_or_runner_invocation() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{not-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.runStatus").value("REJECTED"))
                .andExpect(jsonPath("$.problem").doesNotExist());
        org.assertj.core.api.Assertions.assertThat(Files.exists(RUNNER_INVOKED)).isFalse();
    }

    @Test
    void accepts_an_exactly_16_kib_decoded_source_despite_json_escaping_expansion() throws Exception {
        String source = "exact-source" + "\"".repeat(SubmissionLimits.MAX_SOURCE_BYTES - "exact-source".length());
        String body = submissionBody(source);

        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runStatus").value("COMPLETED"));

        String[] record = Files.readString(RUNNER_RECORD).split("\\R");
        org.assertj.core.api.Assertions.assertThat(record[2]).isEqualTo("16384");
    }

    @Test
    void rejects_a_raw_json_body_larger_than_the_transport_limit_before_deserialization() throws Exception {
        String rejectedBody = sourceBodyOfByteLength(SubmissionLimits.MAX_REQUEST_BODY_BYTES + 1);

        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(rejectedBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.runStatus").value("REJECTED"))
                .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"))
                .andExpect(jsonPath("$.problem").doesNotExist());
        org.assertj.core.api.Assertions.assertThat(Files.exists(RUNNER_INVOKED)).isFalse();
    }

    private String sourceBodyOfByteLength(int byteLength) {
        String prefix = "{\"source\":\"";
        String suffix = "\"}";
        String body = "{\"problemId\":\"role-update-001\"," + prefix.substring(1)
                + "x".repeat(byteLength - ("{\"problemId\":\"role-update-001\"," + prefix.substring(1)).length()
                        - suffix.length())
                + suffix;
        if (body.getBytes(StandardCharsets.UTF_8).length != byteLength) {
            throw new IllegalArgumentException("test body has an unexpected byte length");
        }
        return body;
    }

    private String submissionBody(String source) {
        return submissionBody("role-update-001", source);
    }

    private String submissionBody(String problemId, String source) {
        return "{\"problemId\":\"" + problemId + "\",\"source\":\""
                + source.replace("\\", "\\\\").replace("\"", "\\\"")
                + "\"}";
    }

    private void assertRunnerInvocation(String problemId, String expectedPath) throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content(submissionBody(problemId, "return requestedRole")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.problem.id").value(problemId))
                .andExpect(jsonPath("$.problem.version").value(1));

        org.assertj.core.api.Assertions.assertThat(Files.readAllLines(RUNNER_INVOKED))
                .containsExactly(problemId, "1", expectedPath);
        Files.delete(RUNNER_INVOKED);
    }
}
