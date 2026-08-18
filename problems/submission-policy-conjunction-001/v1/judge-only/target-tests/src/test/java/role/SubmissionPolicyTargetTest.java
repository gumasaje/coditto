package role;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

class SubmissionPolicyTargetTest {
    @Test
    void requiresBothRoleAndGenerationPolicies() {
        assertFalse(new Lion("어린 사자", 13).canSubmitByAll());
        assertFalse(new Staff("운영진", 14).canSubmitByAll());
    }
}
