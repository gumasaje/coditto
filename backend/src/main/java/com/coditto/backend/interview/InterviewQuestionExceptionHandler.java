package com.coditto.backend.interview;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = InterviewQuestionController.class)
public class InterviewQuestionExceptionHandler {
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> rejectUnreadableInterviewQuestionRequest() {
        return ResponseEntity.badRequest()
                .body(Map.of("error", Map.of("kind", "INVALID_INTERVIEW_QUESTION_REQUEST")));
    }
}
