package role;

import policy.SubmissionPolicy;

public abstract class Role {
    private final String name;
    private final int generation;

    protected Role(String name, int generation) {
        this.name = name;
        this.generation = generation;
    }

    public abstract SubmissionPolicy getRolePolicy();

    public abstract SubmissionPolicy getGenerationPolicy();

    public boolean canSubmitByRole() {
        return getRolePolicy().canSubmit();
    }

    public boolean canSubmitByGeneration() {
        return getGenerationPolicy().canSubmit();
    }

    public boolean canSubmitByAll() {
        return canSubmitByRole() || canSubmitByGeneration();
    }

    public String getName() {
        return name;
    }

    public int getGeneration() {
        return generation;
    }
}
