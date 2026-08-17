package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class JudgeResponseFactory {
    private final ObjectMapper objectMapper;

    public JudgeResponseFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JudgeResult rejectedSubmission() {
        return errorResult(null, "REJECTED", "INVALID_SUBMISSION", HttpStatus.BAD_REQUEST);
    }

    public JudgeResult rejectedSubmission(String problemId, int version) {
        return errorResult(
                new ProblemIdentity(problemId, version),
                "REJECTED",
                "INVALID_SUBMISSION",
                HttpStatus.BAD_REQUEST);
    }

    public JudgeResult infrastructureFailure(String problemId, int version) {
        return errorResult(
                new ProblemIdentity(problemId, version),
                "SYSTEM_FAILED",
                "INFRA_ERROR",
                HttpStatus.BAD_GATEWAY);
    }

    public JudgeResult fromRunner(JsonNode result) {
        return new JudgeResult(result, "COMPLETED".equals(result.path("runStatus").textValue())
                ? HttpStatus.OK.value()
                : "REJECTED".equals(result.path("runStatus").textValue())
                        ? HttpStatus.BAD_REQUEST.value()
                        : HttpStatus.BAD_GATEWAY.value());
    }

    private JudgeResult errorResult(
            ProblemIdentity identity,
            String runStatus,
            String errorKind,
            HttpStatus httpStatus) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("schemaVersion", "draft-v0");
        if (identity != null) {
            ObjectNode problem = result.putObject("problem");
            problem.put("id", identity.id());
            problem.put("version", identity.version());
        }
        result.put("runStatus", runStatus);
        result.putObject("error").put("kind", errorKind);
        return new JudgeResult(result, httpStatus.value());
    }

    private record ProblemIdentity(String id, int version) {
    }
}
