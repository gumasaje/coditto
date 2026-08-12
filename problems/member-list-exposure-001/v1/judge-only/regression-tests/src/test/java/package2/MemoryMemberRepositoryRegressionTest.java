package package2;

import org.junit.jupiter.api.Test;
import policy.SubmissionPolicy;
import role.Role;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MemoryMemberRepositoryRegressionTest {
    @Test
    void preservesSaveLookupDuplicateAndPartIndexBehavior() {
        MemoryMemberRepository repository = new MemoryMemberRepository();
        Role backendMember = new TestRole("김사자", "백엔드");
        Role frontendMember = new TestRole("이사자", "프론트엔드");

        repository.save(backendMember);
        repository.save(frontendMember);

        assertEquals(List.of(backendMember, frontendMember), repository.findAll());
        assertSame(backendMember, repository.findByName("김사자"));
        assertTrue(repository.isDuplicate("이사자"));
        assertFalse(repository.isDuplicate("없는멤버"));
        assertEquals(Set.of("백엔드", "프론트엔드"), repository.findAllParts());
        assertEquals(List.of(frontendMember), repository.findAllByPart("프론트엔드"));
    }

    private static final class TestRole extends Role {
        private TestRole(String name, String part) {
            super(name, "컴퓨터공학과", 14, part);
        }

        @Override
        public SubmissionPolicy getRolePolicy() {
            return () -> true;
        }

        @Override
        public SubmissionPolicy getGenerationPolicy() {
            return () -> true;
        }

        @Override
        public String getRoleName() {
            return "테스트";
        }

        @Override
        public String getProfile() {
            return getName();
        }
    }
}
