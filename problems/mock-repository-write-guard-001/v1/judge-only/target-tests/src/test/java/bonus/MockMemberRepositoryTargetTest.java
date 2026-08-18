package bonus;

import org.junit.jupiter.api.Test;
import role.Lion;
import role.Role;

import static org.junit.jupiter.api.Assertions.assertThrows;

class MockMemberRepositoryTargetTest {
    @Test
    void rejectsWritesInsteadOfSilentlyIgnoringThem() {
        MockMemberRepository repository = new MockMemberRepository();
        Role member = new Lion("새사자", "컴퓨터공학과", 14, "백엔드", "20262026");

        assertThrows(UnsupportedOperationException.class, () -> repository.save(member));
        assertThrows(
                UnsupportedOperationException.class,
                () -> repository.deleteByName(repository.findByName("김사자"))
        );
    }
}
