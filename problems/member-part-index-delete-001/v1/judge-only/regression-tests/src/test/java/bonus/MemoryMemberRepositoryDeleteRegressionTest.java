package bonus;

import org.junit.jupiter.api.Test;
import role.Lion;
import role.Role;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;

class MemoryMemberRepositoryDeleteRegressionTest {
    @Test
    void preservesSaveLookupDuplicateAndOverallDeletion() {
        MemoryMemberRepository repository = new MemoryMemberRepository();
        Role backend = new Lion("김사자", "백엔드");
        Role frontend = new Lion("이사자", "프론트엔드");
        repository.save(backend);
        repository.save(frontend);

        assertSame(backend, repository.findByName("김사자"));
        assertEquals(2, repository.findAll().size());
        repository.deleteByName(backend);

        assertFalse(repository.isDuplicate("김사자"));
        assertEquals(List.of(frontend), repository.findAll());
        assertEquals(List.of(frontend), repository.findAllByPart("프론트엔드"));
    }
}
