package com.coditto.backend.interview;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interview-questions")
public class InterviewQuestionController {
    private final InterviewQuestionService service;

    public InterviewQuestionController(InterviewQuestionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody(required = false) JsonNode body) {
        InterviewQuestionRequest request = InterviewQuestionRequest.fromJson(body).orElse(null);
        if (request == null || !service.isValidRequest(request)) {
            return error(400, "INVALID_INTERVIEW_QUESTION_REQUEST");
        }
        try {
            return ResponseEntity.ok(service.generate(request));
        } catch (InterviewQuestionService.InterviewProblemNotFoundException exception) {
            return error(404, "PROBLEM_NOT_FOUND");
        }
    }

    private ResponseEntity<?> error(int status, String kind) {
        return ResponseEntity.status(status).body(Map.of("error", Map.of("kind", kind)));
    }
}
