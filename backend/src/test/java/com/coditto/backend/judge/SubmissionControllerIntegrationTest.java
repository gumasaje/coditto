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

    @Autowired
    private MockMvc mockMvc;

    @DynamicPropertySource
    static void runnerProperties(DynamicPropertyRegistry registry) {
        registry.add("coditto.runner.script-path", TEST_RUNNER::toString);
        registry.add("coditto.runner.timeout", () -> "250ms");
    }

    @AfterEach
    void removeRunnerRecord() throws Exception {
        Files.deleteIfExists(RUNNER_RECORD);
    }

    @Test
    void returns_the_normalized_runner_result_for_a_single_source_file() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{\"source\":\"class RoleService { String updateRole() { return requestedRole; } }\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.check.id").value("official"))
                .andExpect(jsonPath("$.check.execution").value("TESTS_PASSED"));
    }

    @Test
    void rejects_runner_stdout_that_is_not_exactly_one_contract_json_line() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{\"source\":\"not-json\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));
    }

    @Test
    void maps_a_valid_runner_rejection_to_bad_request() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{\"source\":\"rejected\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.runStatus").value("REJECTED"))
                .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"));
    }

    @Test
    void maps_a_valid_runner_system_failure_to_bad_gateway() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{\"source\":\"system-failed\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                .andExpect(jsonPath("$.error.kind").value("CONTENT_ERROR"));
    }

    @Test
    void rejects_a_runner_result_with_an_invalid_exit_status_or_json_types() throws Exception {
        for (String source : new String[] {"wrong-exit", "wrong-types"}) {
            mockMvc.perform(post("/api/submissions")
                            .contentType("application/json")
                            .content("{\"source\":\"" + source + "\"}"))
                    .andExpect(status().isBadGateway())
                    .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                    .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));
        }
    }

    @Test
    void rejects_runner_stdout_larger_than_the_api_capture_limit_without_blocking() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{\"source\":\"oversized-stdout\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.runStatus").value("SYSTEM_FAILED"))
                .andExpect(jsonPath("$.error.kind").value("INFRA_ERROR"));
    }

    @Test
    void returns_infrastructure_failure_when_runner_does_not_finish_before_api_timeout() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType("application/json")
                        .content("{\"source\":\"timeout\"}"))
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
                        .content("{\"source\":\"stubborn-descendant\"}"))
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
                .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"));
    }

    @Test
    void accepts_an_exactly_16_kib_decoded_source_despite_json_escaping_expansion() throws Exception {
        String source = "exact-source" + "\"".repeat(SubmissionLimits.MAX_SOURCE_BYTES - "exact-source".length());
        String body = "{\"source\":\"" + source.replace("\"", "\\\"") + "\"}";

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
                .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"));
    }

    private String sourceBodyOfByteLength(int byteLength) {
        String prefix = "{\"source\":\"";
        String suffix = "\"}";
        String body = prefix + "x".repeat(byteLength - prefix.length() - suffix.length()) + suffix;
        if (body.getBytes(StandardCharsets.UTF_8).length != byteLength) {
            throw new IllegalArgumentException("test body has an unexpected byte length");
        }
        return body;
    }
}
