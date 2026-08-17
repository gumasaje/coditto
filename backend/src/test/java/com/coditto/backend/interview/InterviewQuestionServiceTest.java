package com.coditto.backend.interview;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.coditto.backend.problem.InterviewProblem;
import com.coditto.backend.problem.ProblemCatalogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
@ExtendWith(MockitoExtension.class)
class InterviewQuestionServiceTest {
    @Mock
    private ProblemCatalogService catalog;
    @Mock
    private UnifiedDiffGenerator diffGenerator;
    @Mock
    private InterviewPromptBuilder promptBuilder;
    @Mock
    private InterviewQuestionProvider provider;

    private InterviewQuestionService service;
    private final InterviewQuestionRequest request = new InterviewQuestionRequest("role-update-001", 1, "changed");

    @BeforeEach
    void setUp() {
        service = new InterviewQuestionService(
                catalog,
                diffGenerator,
                promptBuilder,
                provider,
                new ObjectMapper(),
                Duration.ofMillis(20));
        when(catalog.resolveInterview("role-update-001", 1)).thenReturn(Optional.of(
                new InterviewProblem("role-update-001", 1, "Candidate.java", 16384, "statement", "base")));
        when(diffGenerator.generate("Candidate.java", "base", "changed")).thenReturn("diff");
        lenient().when(promptBuilder.build("statement", "diff")).thenReturn("prompt");
    }

    @Test
    void returns_generated_only_for_exactly_three_valid_distinct_questions() {
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate("prompt")).thenReturn(CompletableFuture.completedFuture(validQuestions()));

        InterviewQuestionResponse response = service.generate(request);

        Assertions.assertThat(response.status()).isEqualTo("GENERATED");
        Assertions.assertThat(response.questions()).hasSize(3).extracting(InterviewQuestion::question)
                .containsExactly("Q1", "Q2", "Q3");
    }

    @Test
    void normalizes_invalid_provider_content_without_exposing_it() {
        when(provider.isConfigured()).thenReturn(true);
        for (String content : new String[] {
                "not-json",
                "{\"questions\":[]}",
                "{\"questions\":[{\"question\":\"Q1\",\"rationale\":\"R1\"}]}",
                "{\"questions\":[{\"question\":\"Q1\",\"rationale\":\"R1\"},"
                        + "{\"question\":\"Q1\",\"rationale\":\"R2\"},"
                        + "{\"question\":\"Q3\",\"rationale\":\"R3\"}]}",
                "{\"questions\":[{\"question\":\" \",\"rationale\":\"R1\"},"
                        + "{\"question\":\"Q2\",\"rationale\":\"R2\"},"
                        + "{\"question\":\"Q3\",\"rationale\":\"R3\"}]}",
                "{\"questions\":[{\"question\":\"Q1\",\"rationale\":\"R1\",\"extra\":true},"
                        + "{\"question\":\"Q2\",\"rationale\":\"R2\"},"
                        + "{\"question\":\"Q3\",\"rationale\":\"R3\"}]}"
        }) {
            when(provider.generate("prompt")).thenReturn(CompletableFuture.completedFuture(content));
            Assertions.assertThat(service.generate(request))
                    .isEqualTo(InterviewQuestionResponse.unavailable());
        }
    }

    @Test
    void skips_the_provider_for_empty_diff_or_missing_configuration() {
        when(diffGenerator.generate("Candidate.java", "base", "changed")).thenReturn("");

        Assertions.assertThat(service.generate(request)).isEqualTo(InterviewQuestionResponse.unavailable());
        verify(provider, never()).isConfigured();
        verify(provider, never()).generate(anyString());

        when(diffGenerator.generate("Candidate.java", "base", "changed")).thenReturn("diff");
        when(provider.isConfigured()).thenReturn(false);
        Assertions.assertThat(service.generate(request)).isEqualTo(InterviewQuestionResponse.unavailable());
        verify(provider, never()).generate(anyString());
    }

    @Test
    void cancels_a_provider_call_that_exceeds_the_timeout() {
        CompletableFuture<String> pending = new CompletableFuture<>();
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate("prompt")).thenReturn(pending);

        Assertions.assertThat(service.generate(request)).isEqualTo(InterviewQuestionResponse.unavailable());
        Assertions.assertThat(pending).isCancelled();
    }

    @Test
    void logs_only_the_normalized_failure_kind_not_provider_error_content(CapturedOutput output) {
        when(provider.isConfigured()).thenReturn(true);
        when(provider.generate("prompt")).thenReturn(CompletableFuture.failedFuture(
                new RuntimeException("provider secret response body")));

        Assertions.assertThat(service.generate(request)).isEqualTo(InterviewQuestionResponse.unavailable());
        Assertions.assertThat(output).contains("kind=PROVIDER_ERROR").doesNotContain("provider secret response body");
    }

    private String validQuestions() {
        return """
                {"questions":[
                  {"question":"Q1","rationale":"R1"},
                  {"question":"Q2","rationale":"R2"},
                  {"question":"Q3","rationale":"R3"}
                ]}
                """;
    }
}
