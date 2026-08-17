package com.coditto.backend.interview;

import java.util.concurrent.CompletableFuture;

/** Provider boundary: it receives a finished prompt and returns only JSON content. */
public interface InterviewQuestionProvider {
    boolean isConfigured();

    CompletableFuture<String> generate(String prompt);
}
