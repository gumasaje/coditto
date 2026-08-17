package com.coditto.backend.judge;

public record ResolvedSubmission(
        String problemId,
        int version,
        String candidatePath,
        int maxCandidateBytes,
        String source) {
}
