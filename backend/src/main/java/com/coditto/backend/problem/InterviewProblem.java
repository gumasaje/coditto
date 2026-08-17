package com.coditto.backend.problem;

/** Immutable public problem material permitted for interview-question generation. */
public record InterviewProblem(
        String id,
        int version,
        String allowedPath,
        int maxBytes,
        String statement,
        String baseContent) {
}
