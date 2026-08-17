package com.coditto.backend.problem;

import java.util.List;

public record ProblemCatalogResponse(
        List<String> categories,
        List<ProblemSummary> problems) {

    public record ProblemSummary(
            String id,
            int version,
            String title,
            String category,
            String stack,
            String bugType,
            int estimatedMinutes,
            String difficulty) {
    }
}
