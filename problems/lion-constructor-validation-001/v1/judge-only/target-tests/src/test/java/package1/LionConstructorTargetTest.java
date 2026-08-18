package package1;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class LionConstructorTargetTest {
    @Test
    void rejectsInvalidStateDuringConstruction() {
        assertThrows(IllegalArgumentException.class, () -> new Lion(" ", "컴퓨터공학과", 14));
        assertThrows(IllegalArgumentException.class, () -> new Lion("김사자", null, 14));
        assertThrows(IllegalArgumentException.class, () -> new Lion("김사자", "컴퓨터공학과", 0));
    }
}
