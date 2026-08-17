package com.coditto.backend.interview;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;
import java.util.Set;

/** Strict HTTP request shape for the interview-question endpoint. */
public record InterviewQuestionRequest(String problemId, Integer version, String source) {
    private static final Set<String> ALLOWED_FIELDS = Set.of("problemId", "version", "source");

    public static Optional<InterviewQuestionRequest> fromJson(JsonNode value) {
        if (value == null || !value.isObject() || value.size() < 2 || value.size() > 3) {
            return Optional.empty();
        }
        var fields = value.fieldNames();
        while (fields.hasNext()) {
            if (!ALLOWED_FIELDS.contains(fields.next())) {
                return Optional.empty();
            }
        }

        JsonNode problemId = value.get("problemId");
        JsonNode source = value.get("source");
        if (problemId == null || !problemId.isTextual() || source == null || !source.isTextual()) {
            return Optional.empty();
        }

        Integer version = null;
        if (value.has("version")) {
            JsonNode versionNode = value.get("version");
            if (versionNode == null || !versionNode.isInt() || versionNode.intValue() <= 0) {
                return Optional.empty();
            }
            version = versionNode.intValue();
        }
        return Optional.of(new InterviewQuestionRequest(problemId.textValue(), version, source.textValue()));
    }
}
