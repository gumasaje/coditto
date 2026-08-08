package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class JudgeResponseFactory {
    static final String PROBLEM_ID = "role-update-001";
    static final int VERSION = 1;

    private final ObjectMapper objectMapper;

    public JudgeResponseFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JudgeResult rejectedSubmission() {
        return errorResult("REJECTED", "INVALID_SUBMISSION", HttpStatus.BAD_REQUEST);
    }

    public JudgeResult infrastructureFailure() {
        return errorResult("SYSTEM_FAILED", "INFRA_ERROR", HttpStatus.BAD_GATEWAY);
    }

    public JudgeResult fromRunner(JsonNode result) {
        return new JudgeResult(result, "COMPLETED".equals(result.path("runStatus").textValue())
                ? HttpStatus.OK.value()
                : "REJECTED".equals(result.path("runStatus").textValue())
                        ? HttpStatus.BAD_REQUEST.value()
                        : HttpStatus.BAD_GATEWAY.value());
    }

    private JudgeResult errorResult(String runStatus, String errorKind, HttpStatus httpStatus) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("schemaVersion", "draft-v0");
        ObjectNode problem = result.putObject("problem");
        problem.put("id", PROBLEM_ID);
        problem.put("version", VERSION);
        result.put("runStatus", runStatus);
        result.putObject("error").put("kind", errorKind);
        return new JudgeResult(result, httpStatus.value());
    }
}
