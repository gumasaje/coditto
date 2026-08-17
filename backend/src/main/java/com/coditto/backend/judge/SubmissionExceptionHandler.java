package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = SubmissionController.class)
public class SubmissionExceptionHandler {
    private final JudgeResponseFactory responseFactory;

    public SubmissionExceptionHandler(JudgeResponseFactory responseFactory) {
        this.responseFactory = responseFactory;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<JsonNode> rejectUnreadableSubmission() {
        JudgeResult result = responseFactory.rejectedSubmission();
        return ResponseEntity.status(result.httpStatus()).body(result.body());
    }
}
