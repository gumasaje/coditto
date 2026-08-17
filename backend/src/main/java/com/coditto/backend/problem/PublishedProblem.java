package com.coditto.backend.problem;

/** Submission-facing information from one validated, published problem version. */
public record PublishedProblem(
        String id,
        int version,
        String candidatePath,
        int maxCandidateBytes) {
}
