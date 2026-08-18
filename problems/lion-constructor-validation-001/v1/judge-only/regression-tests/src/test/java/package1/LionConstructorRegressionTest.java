package package1;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

class LionConstructorRegressionTest {
    @Test
    void keepsValidLionState() {
        Lion lion = assertDoesNotThrow(() -> new Lion("김사자", "컴퓨터공학과", 14));

        assertEquals("김사자", lion.name);
        assertEquals("컴퓨터공학과", lion.major);
        assertEquals(14, lion.getGeneration());
    }

    @Test
    void explicitValidationStillWorks() {
        Lion lion = new Lion("김사자", "컴퓨터공학과", 14);

        assertDoesNotThrow(lion::validate);
    }
}
