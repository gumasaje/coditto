package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
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

    // The transport status stays accurate while the body keeps the judge
    // contract shape, so a client never has to parse a framework error page.
    // An unsupported method is resolved before this controller-scoped advice
    // runs, so it keeps the framework's own error response.
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<JsonNode> rejectUnsupportedMediaType() {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(responseFactory.rejectedSubmission().body());
    }
}
