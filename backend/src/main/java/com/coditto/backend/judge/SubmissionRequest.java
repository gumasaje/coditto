package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;

/**
 * One source file for a published problem. The source is never loaded or
 * executed by this API process.
 */
public record SubmissionRequest(String problemId, Integer version, String source) {
    public static Optional<SubmissionRequest> fromJson(JsonNode value) {
        if (value == null || !value.isObject()) {
            return Optional.empty();
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
        return Optional.of(new SubmissionRequest(problemId.textValue(), version, source.textValue()));
    }
}
