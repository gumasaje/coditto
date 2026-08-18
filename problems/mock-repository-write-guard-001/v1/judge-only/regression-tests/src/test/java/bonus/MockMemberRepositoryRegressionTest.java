package bonus;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MockMemberRepositoryRegressionTest {
    @Test
    void keepsTheSeededReadOnlyDataAvailable() {
        MockMemberRepository repository = new MockMemberRepository();

        assertFalse(repository.isWritable());
        assertEquals(4, repository.findAll().size());
        assertNotNull(repository.findByName("김사자"));
        assertTrue(repository.findAllParts().contains("백엔드"));
        assertEquals(1, repository.findAllByPart("백엔드").size());
        assertTrue(repository.findAllByPart("없는 파트").isEmpty());
    }
}
