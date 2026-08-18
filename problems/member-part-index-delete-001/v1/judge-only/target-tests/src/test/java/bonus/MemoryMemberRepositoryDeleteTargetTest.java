package bonus;

import org.junit.jupiter.api.Test;
import role.Lion;
import role.Role;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MemoryMemberRepositoryDeleteTargetTest {
    @Test
    void removesDeletedMemberFromThePartIndex() {
        MemoryMemberRepository repository = new MemoryMemberRepository();
        Role member = new Lion("김사자", "백엔드");
        repository.save(member);

        repository.deleteByName(member);

        assertTrue(repository.findAllByPart("백엔드").isEmpty());
        assertFalse(repository.findAllParts().contains("백엔드"));
    }

    @Test
    void keepsOtherMembersInTheSamePart() {
        MemoryMemberRepository repository = new MemoryMemberRepository();
        Role first = new Lion("김사자", "백엔드");
        Role second = new Lion("이사자", "백엔드");
        repository.save(first);
        repository.save(second);

        repository.deleteByName(first);

        assertEquals(List.of(second), repository.findAllByPart("백엔드"));
        assertTrue(repository.findAllParts().contains("백엔드"));
    }
}
