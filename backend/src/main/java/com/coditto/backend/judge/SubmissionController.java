package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
    private final JudgeRunnerClient judgeRunnerClient;

    public SubmissionController(JudgeRunnerClient judgeRunnerClient) {
        this.judgeRunnerClient = judgeRunnerClient;
    }

    @PostMapping
    public ResponseEntity<JsonNode> submit(@RequestBody(required = false) SubmissionRequest request) {
        JudgeResult result = judgeRunnerClient.judge(request);
        return ResponseEntity.status(result.httpStatus()).body(result.body());
    }
}
