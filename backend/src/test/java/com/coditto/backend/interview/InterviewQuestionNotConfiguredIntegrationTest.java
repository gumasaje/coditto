package com.coditto.backend.interview;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "coditto.interview.openai.api-key=")
@AutoConfigureMockMvc
class InterviewQuestionNotConfiguredIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void returns_unavailable_without_starting_an_openai_http_call_when_key_is_missing() throws Exception {
        mockMvc.perform(post("/api/interview-questions")
                        .contentType("application/json")
                        .content("{\"problemId\":\"role-update-001\",\"source\":\"class Changed {}\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.questions.length()").value(0));
    }
}
