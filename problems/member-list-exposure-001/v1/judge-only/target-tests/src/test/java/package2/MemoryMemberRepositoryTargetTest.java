package package2;

import org.junit.jupiter.api.Test;
import policy.SubmissionPolicy;
import role.Role;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class MemoryMemberRepositoryTargetTest {
    @Test
    void changingTheReturnedListDoesNotChangeStoredMembers() {
        MemoryMemberRepository repository = new MemoryMemberRepository();
        Role member = new TestRole("김사자", "백엔드");
        repository.save(member);

        List<Role> result = repository.findAll();
        try {
            result.clear();
        } catch (UnsupportedOperationException ignored) {
            // An immutable snapshot is also a valid defensive result.
        }

        assertSame(member, repository.findByName("김사자"));
        assertEquals(1, repository.findAll().size());
        assertEquals(List.of(member), repository.findAllByPart("백엔드"));
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
