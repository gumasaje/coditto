package role;

import policy.GenerationSubmissionPolicy;
import policy.LionSubmissionPolicy;
import policy.SubmissionPolicy;

public class Lion extends Role {
    public Lion(String name, int generation) {
        super(name, generation);
    }

    @Override
    public SubmissionPolicy getRolePolicy() {
        return new LionSubmissionPolicy();
    }

    @Override
    public SubmissionPolicy getGenerationPolicy() {
        return new GenerationSubmissionPolicy(getGeneration());
    }
}
