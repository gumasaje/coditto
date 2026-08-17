package com.coditto.backend.interview;

import com.coditto.backend.judge.SubmissionLimits;
import com.coditto.backend.problem.InterviewProblem;
import com.coditto.backend.problem.ProblemCatalogService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class InterviewQuestionService {
    static final Duration PROVIDER_TIMEOUT = Duration.ofSeconds(8);

    private static final Logger LOGGER = LoggerFactory.getLogger(InterviewQuestionService.class);
    private static final Set<String> QUESTION_FIELDS = Set.of("question", "rationale");

    private final ProblemCatalogService problemCatalogService;
    private final UnifiedDiffGenerator diffGenerator;
    private final InterviewPromptBuilder promptBuilder;
    private final InterviewQuestionProvider provider;
    private final ObjectMapper objectMapper;
    private final Duration providerTimeout;

    @Autowired
    public InterviewQuestionService(
            ProblemCatalogService problemCatalogService,
            UnifiedDiffGenerator diffGenerator,
            InterviewPromptBuilder promptBuilder,
            InterviewQuestionProvider provider,
            ObjectMapper objectMapper) {
        this(problemCatalogService, diffGenerator, promptBuilder, provider, objectMapper, PROVIDER_TIMEOUT);
    }

    InterviewQuestionService(
            ProblemCatalogService problemCatalogService,
            UnifiedDiffGenerator diffGenerator,
            InterviewPromptBuilder promptBuilder,
            InterviewQuestionProvider provider,
            ObjectMapper objectMapper,
            Duration providerTimeout) {
        this.problemCatalogService = problemCatalogService;
        this.diffGenerator = diffGenerator;
        this.promptBuilder = promptBuilder;
        this.provider = provider;
        this.objectMapper = objectMapper;
        this.providerTimeout = providerTimeout;
    }

    public boolean isValidRequest(InterviewQuestionRequest request) {
        return ProblemCatalogService.isValidProblemId(request.problemId())
                && request.source().getBytes(StandardCharsets.UTF_8).length <= SubmissionLimits.MAX_SOURCE_BYTES;
    }

    public InterviewQuestionResponse generate(InterviewQuestionRequest request) {
        InterviewProblem problem = problemCatalogService.resolveInterview(request.problemId(), request.version())
                .orElseThrow(InterviewProblemNotFoundException::new);
        String diff = diffGenerator.generate(problem.allowedPath(), problem.baseContent(), request.source());
        if (diff.isEmpty()) {
            return unavailable(InterviewFailureKind.EMPTY_DIFF);
        }
        if (!provider.isConfigured()) {
            return unavailable(InterviewFailureKind.NOT_CONFIGURED);
        }

        var generation = provider.generate(promptBuilder.build(problem.statement(), diff));
        try {
            String content = generation.get(providerTimeout.toMillis(), TimeUnit.MILLISECONDS);
            return InterviewQuestionResponse.generated(parseQuestions(content));
        } catch (TimeoutException exception) {
            generation.cancel(true);
            return unavailable(InterviewFailureKind.TIMEOUT);
        } catch (InterruptedException exception) {
            generation.cancel(true);
            Thread.currentThread().interrupt();
            return unavailable(InterviewFailureKind.PROVIDER_ERROR);
        } catch (ExecutionException exception) {
            return unavailable(classify(exception.getCause()));
        } catch (RuntimeException exception) {
            return unavailable(classify(exception));
        }
    }

    private List<InterviewQuestion> parseQuestions(String content) {
        try {
            JsonNode root = objectMapper.reader()
                    .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readTree(content);
            if (root == null || !root.isObject() || root.size() != 1 || !root.has("questions")) {
                throw new InvalidProviderOutputException();
            }
            JsonNode questions = root.get("questions");
            if (!questions.isArray() || questions.size() != 3) {
                throw new InvalidProviderOutputException();
            }

            List<InterviewQuestion> parsed = new ArrayList<>();
            for (JsonNode question : questions) {
                if (!question.isObject() || question.size() != QUESTION_FIELDS.size()) {
                    throw new InvalidProviderOutputException();
                }
                var fields = question.fieldNames();
                while (fields.hasNext()) {
                    if (!QUESTION_FIELDS.contains(fields.next())) {
                        throw new InvalidProviderOutputException();
                    }
                }
                JsonNode text = question.get("question");
                JsonNode rationale = question.get("rationale");
                if (text == null || !text.isTextual() || text.textValue().isBlank()
                        || rationale == null || !rationale.isTextual() || rationale.textValue().isBlank()) {
                    throw new InvalidProviderOutputException();
                }
                parsed.add(new InterviewQuestion(text.textValue(), rationale.textValue()));
            }
            if (new HashSet<>(parsed).size() != 3
                    || parsed.stream().map(InterviewQuestion::question).distinct().count() != 3) {
                throw new InvalidProviderOutputException();
            }
            return parsed;
        } catch (JsonProcessingException exception) {
            throw new InvalidProviderOutputException();
        }
    }

    private InterviewFailureKind classify(Throwable exception) {
        if (exception instanceof InvalidProviderOutputException) {
            return InterviewFailureKind.INVALID_PROVIDER_OUTPUT;
        }
        if (exception instanceof TimeoutException || exception instanceof HttpTimeoutException) {
            return InterviewFailureKind.TIMEOUT;
        }
        return InterviewFailureKind.PROVIDER_ERROR;
    }

    private InterviewQuestionResponse unavailable(InterviewFailureKind kind) {
        LOGGER.warn("Interview question generation unavailable: kind={}", kind);
        return InterviewQuestionResponse.unavailable();
    }

    static final class InterviewProblemNotFoundException extends RuntimeException {
        private InterviewProblemNotFoundException() {
            super(null, null, false, false);
        }
    }
}
