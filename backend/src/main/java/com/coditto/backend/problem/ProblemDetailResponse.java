package com.coditto.backend.problem;

import java.util.List;

public record ProblemDetailResponse(
        String id,
        int version,
        String title,
        String category,
        String difficulty,
        int estimatedMinutes,
        String statement,
        List<ProblemFile> files,
        Candidate candidate) {

    public record ProblemFile(String path, boolean editable, String content) {
    }

    public record Candidate(List<String> allowedPaths, int maxFiles, int maxBytes) {
    }
}
