package com.coditto.backend.judge;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SubmissionBodyLimitFilterTest {
    @Test
    void rejects_an_interview_question_stream_that_crosses_the_limit_while_being_read() throws Exception {
        byte[] body = "x".repeat(SubmissionLimits.MAX_REQUEST_BODY_BYTES + 1).getBytes(StandardCharsets.UTF_8);
        MockHttpServletRequest request = new MockHttpServletRequest() {
            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        request.setMethod("POST");
        request.setRequestURI("/api/interview-questions");
        request.setContent(body);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainReached = new AtomicBoolean();
        FilterChain chain = (limitedRequest, ignoredResponse) -> {
            chainReached.set(true);
            limitedRequest.getInputStream().readAllBytes();
        };

        new SubmissionBodyLimitFilter(new JudgeResponseFactory(new ObjectMapper()), new ObjectMapper())
                .doFilter(request, response, chain);

        assertThat(chainReached).isTrue();
        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentAsString())
                .contains("\"runStatus\":\"REJECTED\"")
                .contains("\"kind\":\"INVALID_SUBMISSION\"");
    }
}
