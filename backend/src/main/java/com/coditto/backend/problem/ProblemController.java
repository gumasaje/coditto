package com.coditto.backend.problem;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {
    private final ProblemCatalogService problemCatalogService;

    public ProblemController(ProblemCatalogService problemCatalogService) {
        this.problemCatalogService = problemCatalogService;
    }

    @GetMapping
    public ProblemCatalogResponse list() {
        return problemCatalogService.catalog();
    }

    @GetMapping("/{problemId}")
    public ResponseEntity<?> detail(@PathVariable String problemId) {
        if (!ProblemCatalogService.isValidProblemId(problemId)) {
            return error(400, "INVALID_PROBLEM_ID");
        }
        return problemCatalogService.latestDetail(problemId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> error(404, "PROBLEM_NOT_FOUND"));
    }

    private ResponseEntity<?> error(int status, String kind) {
        return ResponseEntity.status(status).body(Map.of("error", Map.of("kind", kind)));
    }
}
