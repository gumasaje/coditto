package role;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SubmissionPolicyRegressionTest {
    @Test
    void allowsLionWhenBothPoliciesPass() {
        Lion lion = new Lion("김사자", 14);

        assertTrue(lion.canSubmitByRole());
        assertTrue(lion.canSubmitByGeneration());
        assertTrue(lion.canSubmitByAll());
    }

    @Test
    void preservesProfileFieldsAndIndependentPolicyResults() {
        Staff staff = new Staff("이사자", 13);

        assertEquals("이사자", staff.getName());
        assertEquals(13, staff.getGeneration());
        assertFalse(staff.canSubmitByRole());
        assertFalse(staff.canSubmitByGeneration());
    }
}
