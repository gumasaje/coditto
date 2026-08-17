package com.coditto.backend.interview;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.coditto.backend.judge.SubmissionLimits;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "coditto.interview.openai.api-key=")
@AutoConfigureMockMvc
class InterviewQuestionControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InterviewQuestionProvider provider;

    @BeforeEach
    void configuredProviderReturnsValidQuestions() {
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate(anyString())).thenReturn(CompletableFuture.completedFuture("""
                {"questions":[
                  {"question":"Q1","rationale":"R1"},
                  {"question":"Q2","rationale":"R2"},
                  {"question":"Q3","rationale":"R3"}
                ]}
                """));
    }

    @Test
    void generates_questions_for_latest_and_explicit_published_versions() throws Exception {
        for (String body : new String[] {
                requestBody("role-update-001", null, "class Changed {}"),
                requestBody("role-update-001", 1, "class Changed {}")
        }) {
            mockMvc.perform(post("/api/interview-questions")
                            .contentType("application/json")
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("GENERATED"))
                    .andExpect(jsonPath("$.questions.length()").value(3));
        }
    }

    @Test
    void rejects_invalid_request_shapes_without_invoking_the_provider() throws Exception {
        for (String body : new String[] {
                "{not-json",
                "[]",
                "\"scalar\"",
                "{}",
                "{\"problemId\":null,\"source\":\"x\"}",
                "{\"problemId\":\"Role_Update\",\"source\":\"x\"}",
                "{\"problemId\":\"role-update-001\",\"version\":0,\"source\":\"x\"}",
                "{\"problemId\":\"role-update-001\",\"version\":1.5,\"source\":\"x\"}",
                "{\"problemId\":\"role-update-001\",\"source\":\"x\",\"outcome\":\"TESTS_PASSED\"}",
                requestBody("role-update-001", null, "x".repeat(SubmissionLimits.MAX_SOURCE_BYTES + 1))
        }) {
            mockMvc.perform(post("/api/interview-questions")
                            .contentType("application/json")
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.kind").value("INVALID_INTERVIEW_QUESTION_REQUEST"));
        }
        verify(provider, never()).generate(anyString());
    }

    @Test
    void returns_not_found_for_an_unknown_published_problem_without_invoking_provider() throws Exception {
        mockMvc.perform(post("/api/interview-questions")
                        .contentType("application/json")
                        .content(requestBody("unknown-problem", null, "changed")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.kind").value("PROBLEM_NOT_FOUND"));
        verify(provider, never()).generate(anyString());
    }

    @Test
    void skips_the_provider_and_normalizes_an_empty_diff() throws Exception {
        String base = Files.readString(Path.of("../problems/role-update-001/v1/base/src/main/java/com/coditto/demo/RoleService.java"));

        mockMvc.perform(post("/api/interview-questions")
                        .contentType("application/json")
                        .content(requestBody("role-update-001", 1, base)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.questions.length()").value(0));
        verify(provider, never()).generate(anyString());
    }

    @Test
    void applies_the_existing_transport_rejection_before_deserialization() throws Exception {
        String prefix = "{\"problemId\":\"role-update-001\",\"source\":\"";
        String suffix = "\"}";
        String body = prefix + "x".repeat(SubmissionLimits.MAX_REQUEST_BODY_BYTES + 1 - prefix.length() - suffix.length()) + suffix;

        mockMvc.perform(post("/api/interview-questions")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.runStatus").value("REJECTED"))
                .andExpect(jsonPath("$.error.kind").value("INVALID_SUBMISSION"));
        verify(provider, never()).generate(anyString());
    }

    private String requestBody(String problemId, Integer version, String source) {
        String versionField = version == null ? "" : "\"version\":" + version + ",";
        return "{\"problemId\":\"" + problemId + "\"," + versionField + "\"source\":\""
                + source.replace("\\", "\\\\").replace("\"", "\\\"")
                        .replace("\r", "\\r").replace("\n", "\\n")
                + "\"}";
    }
}
