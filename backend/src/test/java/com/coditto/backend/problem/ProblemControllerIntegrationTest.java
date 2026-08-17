package com.coditto.backend.problem;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ProblemControllerIntegrationTest {
    private static final Map<String, String> DISPLAY_FILES = Map.of(
            "member-generation-validation-001",
            "src/main/java/com/likelion/springboot/member/service/MemberService.java",
            "member-list-exposure-001",
            "src/main/java/package2/MemoryMemberRepository.java",
            "role-update-001",
            "src/main/java/com/coditto/demo/RoleService.java");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void lists_all_published_problems_in_deterministic_order() throws Exception {
        mockMvc.perform(get("/api/problems"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0]").value("Backend"))
                .andExpect(jsonPath("$.categories[1]").value("Frontend"))
                .andExpect(jsonPath("$.categories[2]").value("Data·AI"))
                .andExpect(jsonPath("$.problems.length()").value(3))
                .andExpect(jsonPath("$.problems[0].id").value("member-generation-validation-001"))
                .andExpect(jsonPath("$.problems[1].id").value("member-list-exposure-001"))
                .andExpect(jsonPath("$.problems[2].id").value("role-update-001"));
    }

    @Test
    void returns_each_problem_detail_from_the_startup_index_without_hidden_assets() throws Exception {
        for (Map.Entry<String, String> entry : DISPLAY_FILES.entrySet()) {
            String problemId = entry.getKey();
            String displayPath = entry.getValue();
            String expectedContent = Files.readString(Path.of("../problems", problemId, "v1", "base", displayPath));
            String expectedStatement = Files.readString(Path.of("../problems", problemId, "v1", "statement.md"));

            String response = mockMvc.perform(get("/api/problems/{problemId}", problemId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(problemId))
                    .andExpect(jsonPath("$.version").value(1))
                    .andExpect(jsonPath("$.statement").value(expectedStatement))
                    .andExpect(jsonPath("$.files.length()").value(1))
                    .andExpect(jsonPath("$.files[0].path").value(displayPath))
                    .andExpect(jsonPath("$.files[0].editable").value(true))
                    .andExpect(jsonPath("$.files[0].content").value(expectedContent))
                    .andExpect(jsonPath("$.candidate.allowedPaths[0]").value(displayPath))
                    .andExpect(jsonPath("$.candidate.maxFiles").value(1))
                    .andExpect(jsonPath("$.candidate.maxBytes").value(16384))
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

            Assertions.assertThat(response)
                    .doesNotContain("judge-only")
                    .doesNotContain("reference.patch")
                    .doesNotContain("TargetTest")
                    .doesNotContain("RegressionTest");
        }
    }

    @Test
    void distinguishes_invalid_slugs_from_missing_problems() throws Exception {
        mockMvc.perform(get("/api/problems/{problemId}", "Invalid_Problem"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.kind").value("INVALID_PROBLEM_ID"));

        mockMvc.perform(get("/api/problems/{problemId}", "unknown-problem"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.kind").value("PROBLEM_NOT_FOUND"));
    }
}
