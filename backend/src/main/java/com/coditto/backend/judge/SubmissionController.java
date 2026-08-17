package com.coditto.backend.judge;

import com.coditto.backend.problem.ProblemCatalogService;
import com.coditto.backend.problem.PublishedProblem;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
    private final JudgeRunnerClient judgeRunnerClient;
    private final JudgeResponseFactory responseFactory;
    private final ProblemCatalogService problemCatalogService;

    public SubmissionController(
            JudgeRunnerClient judgeRunnerClient,
            JudgeResponseFactory responseFactory,
            ProblemCatalogService problemCatalogService) {
        this.judgeRunnerClient = judgeRunnerClient;
        this.responseFactory = responseFactory;
        this.problemCatalogService = problemCatalogService;
    }

    @PostMapping
    public ResponseEntity<JsonNode> submit(@RequestBody(required = false) JsonNode body) {
        SubmissionRequest request = SubmissionRequest.fromJson(body).orElse(null);
        if (request == null || !ProblemCatalogService.isValidProblemId(request.problemId())) {
            return response(responseFactory.rejectedSubmission());
        }
        PublishedProblem problem = problemCatalogService.resolve(request.problemId(), request.version()).orElse(null);
        if (problem == null) {
            return response(responseFactory.rejectedSubmission());
        }
        if (request.source().getBytes(StandardCharsets.UTF_8).length
                > Math.min(SubmissionLimits.MAX_SOURCE_BYTES, problem.maxCandidateBytes())) {
            return response(responseFactory.rejectedSubmission(problem.id(), problem.version()));
        }
        JudgeResult result = judgeRunnerClient.judge(new ResolvedSubmission(
                problem.id(),
                problem.version(),
                problem.candidatePath(),
                problem.maxCandidateBytes(),
                request.source()));
        return response(result);
    }

    private ResponseEntity<JsonNode> response(JudgeResult result) {
        return ResponseEntity.status(result.httpStatus()).body(result.body());
    }
}
