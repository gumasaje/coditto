package role;

import policy.GenerationSubmissionPolicy;
import policy.StaffSubmissionPolicy;
import policy.SubmissionPolicy;

public class Staff extends Role {
    public Staff(String name, int generation) {
        super(name, generation);
    }

    @Override
    public SubmissionPolicy getRolePolicy() {
        return new StaffSubmissionPolicy();
    }

    @Override
    public SubmissionPolicy getGenerationPolicy() {
        return new GenerationSubmissionPolicy(getGeneration());
    }
}
