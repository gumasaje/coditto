package com.coditto.backend.problem;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
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
    private static final Map<String, List<String>> DISPLAY_FILES = Map.ofEntries(
            Map.entry("assignment-member-existence-001", List.of(
                    "src/main/java/com/likelion/springboot/assignment/service/AssignmentService.java",
                    "src/main/java/com/likelion/springboot/assignment/repository/AssignmentRepository.java",
                    "src/main/java/com/likelion/springboot/member/repository/MemberRepository.java",
                    "src/main/java/com/likelion/springboot/assignment/domain/Assignment.java",
                    "src/main/java/com/likelion/springboot/member/domain/Member.java",
                    "src/main/java/com/likelion/springboot/global/exception/MemberNotFoundException.java")),
            Map.entry("assignment-title-search-001", List.of(
                    "src/main/java/com/likelion/springboot/assignment/service/AssignmentService.java",
                    "src/main/java/com/likelion/springboot/assignment/repository/AssignmentRepository.java",
                    "src/main/java/com/likelion/springboot/assignment/domain/Assignment.java")),
            Map.entry("assignment-title-validation-001", List.of(
                    "src/main/java/com/likelion/springboot/assignment/service/AssignmentService.java",
                    "src/main/java/com/likelion/springboot/assignment/dto/AssignmentCreateRequest.java",
                    "src/main/java/com/likelion/springboot/assignment/domain/Assignment.java",
                    "src/main/java/com/likelion/springboot/member/domain/Member.java",
                    "src/main/java/com/likelion/springboot/assignment/repository/AssignmentRepository.java",
                    "src/main/java/com/likelion/springboot/member/repository/MemberRepository.java",
                    "src/main/java/com/likelion/springboot/global/exception/InvalidAssignmentRequestException.java")),
            Map.entry("lion-constructor-validation-001", List.of(
                    "src/main/java/package1/Lion.java")),
            Map.entry("lion-update-role-validation-001", List.of(
                    "src/main/java/com/likelion/springboot/member/service/MemberService.java",
                    "src/main/java/com/likelion/springboot/member/dto/LionUpdateRequest.java",
                    "src/main/java/com/likelion/springboot/member/domain/Member.java",
                    "src/main/java/com/likelion/springboot/member/domain/RoleType.java",
                    "src/main/java/com/likelion/springboot/member/repository/MemberRepository.java",
                    "src/main/java/com/likelion/springboot/global/exception/InvalidMemberRequestException.java",
                    "src/main/java/com/likelion/springboot/global/exception/MemberNotFoundException.java")),
            Map.entry("member-assignment-cascade-delete-001", List.of(
                    "src/main/java/com/likelion/springboot/member/domain/Member.java",
                    "src/main/java/com/likelion/springboot/assignment/domain/Assignment.java",
                    "src/main/java/com/likelion/springboot/member/repository/MemberRepository.java",
                    "src/main/java/com/likelion/springboot/assignment/repository/AssignmentRepository.java")),
            Map.entry("member-list-exposure-001", List.of(
                    "src/main/java/package2/MemoryMemberRepository.java",
                    "src/main/java/package2/MemberRepository.java")),
            Map.entry("member-name-uniqueness-001", List.of(
                    "src/main/java/com/likelion/springboot/member/service/MemberService.java",
                    "src/main/java/com/likelion/springboot/member/dto/MemberRenameRequest.java",
                    "src/main/java/com/likelion/springboot/member/domain/Member.java",
                    "src/main/java/com/likelion/springboot/member/repository/MemberRepository.java",
                    "src/main/java/com/likelion/springboot/global/exception/DuplicateMemberException.java",
                    "src/main/java/com/likelion/springboot/global/exception/MemberNotFoundException.java")),
            Map.entry("member-part-index-delete-001", List.of(
                    "src/main/java/bonus/MemoryMemberRepository.java",
                    "src/main/java/bonus/MemberRepository.java",
                    "src/main/java/role/Role.java",
                    "src/main/java/role/Lion.java")),
            Map.entry("mock-repository-write-guard-001", List.of(
                    "src/main/java/bonus/MockMemberRepository.java",
                    "src/main/java/bonus/MemberRepository.java",
                    "src/main/java/role/Role.java",
                    "src/main/java/role/Lion.java",
                    "src/main/java/role/Staff.java")),
            Map.entry("role-update-001", List.of(
                    "src/main/java/com/coditto/demo/RoleService.java",
                    "src/main/java/com/coditto/demo/RoleChangeRequest.java")),
            Map.entry("submission-policy-conjunction-001", List.of(
                    "src/main/java/role/Role.java",
                    "src/main/java/role/Lion.java",
                    "src/main/java/role/Staff.java",
                    "src/main/java/policy/SubmissionPolicy.java",
                    "src/main/java/policy/GenerationSubmissionPolicy.java",
                    "src/main/java/policy/LionSubmissionPolicy.java",
                    "src/main/java/policy/StaffSubmissionPolicy.java")));
    private static final Map<String, String> EDITABLE_FILES = Map.ofEntries(
            Map.entry("assignment-member-existence-001",
                    "src/main/java/com/likelion/springboot/assignment/service/AssignmentService.java"),
            Map.entry("assignment-title-search-001",
                    "src/main/java/com/likelion/springboot/assignment/service/AssignmentService.java"),
            Map.entry("assignment-title-validation-001",
                    "src/main/java/com/likelion/springboot/assignment/service/AssignmentService.java"),
            Map.entry("lion-constructor-validation-001", "src/main/java/package1/Lion.java"),
            Map.entry("lion-update-role-validation-001",
                    "src/main/java/com/likelion/springboot/member/service/MemberService.java"),
            Map.entry("member-assignment-cascade-delete-001",
                    "src/main/java/com/likelion/springboot/member/domain/Member.java"),
            Map.entry("member-list-exposure-001", "src/main/java/package2/MemoryMemberRepository.java"),
            Map.entry("member-name-uniqueness-001",
                    "src/main/java/com/likelion/springboot/member/service/MemberService.java"),
            Map.entry("member-part-index-delete-001", "src/main/java/bonus/MemoryMemberRepository.java"),
            Map.entry("mock-repository-write-guard-001", "src/main/java/bonus/MockMemberRepository.java"),
            Map.entry("role-update-001", "src/main/java/com/coditto/demo/RoleService.java"),
            Map.entry("submission-policy-conjunction-001", "src/main/java/role/Role.java"));

    @Autowired
    private MockMvc mockMvc;

    @Test
    void lists_all_published_problems_in_deterministic_order() throws Exception {
        var responseBuilder = mockMvc.perform(get("/api/problems"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0]").value("Backend"))
<<<<<<< Updated upstream
                .andExpect(jsonPath("$.categories.length()").value(1))
=======
                .andExpect(jsonPath("$.categories[1]").value("Data·AI"))
>>>>>>> Stashed changes
                .andExpect(jsonPath("$.problems.length()").value(DISPLAY_FILES.size()));

        List<String> sortedIds = DISPLAY_FILES.keySet().stream().sorted().toList();
        for (int index = 0; index < sortedIds.size(); index++) {
            responseBuilder.andExpect(jsonPath("$.problems[" + index + "].id").value(sortedIds.get(index)));
        }
    }

    @Test
    void returns_each_problem_detail_from_the_startup_index_without_hidden_assets() throws Exception {
        for (Map.Entry<String, List<String>> entry : DISPLAY_FILES.entrySet()) {
            String problemId = entry.getKey();
            List<String> displayPaths = entry.getValue();
            String editablePath = EDITABLE_FILES.get(problemId);
            String expectedStatement = Files.readString(Path.of("../problems", problemId, "v1", "statement.md"));

            var responseBuilder = mockMvc.perform(get("/api/problems/{problemId}", problemId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(problemId))
                    .andExpect(jsonPath("$.version").value(1))
                    .andExpect(jsonPath("$.statement").value(expectedStatement))
                    .andExpect(jsonPath("$.files.length()").value(displayPaths.size()))
                    .andExpect(jsonPath("$.candidate.allowedPaths[0]").value(editablePath))
                    .andExpect(jsonPath("$.candidate.maxFiles").value(1))
                    .andExpect(jsonPath("$.candidate.maxBytes").value(16384));

            for (int index = 0; index < displayPaths.size(); index++) {
                String displayPath = displayPaths.get(index);
                String expectedContent = Files.readString(
                        Path.of("../problems", problemId, "v1", "base", displayPath));
                responseBuilder
                        .andExpect(jsonPath("$.files[" + index + "].path").value(displayPath))
                        .andExpect(jsonPath("$.files[" + index + "].editable")
                                .value(displayPath.equals(editablePath)))
                        .andExpect(jsonPath("$.files[" + index + "].content").value(expectedContent));
            }

            String response = responseBuilder
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
