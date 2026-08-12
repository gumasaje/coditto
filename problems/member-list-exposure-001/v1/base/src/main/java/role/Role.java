package role;

import policy.SubmissionPolicy;

public abstract class Role {
    private String name;
    private String major;
    private int generation;
    private String part;

    protected Role(String name, String major, int generation, String part) {
        this.name = name;
        this.major = major;
        this.generation = generation;
        this.part = part;
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
        return canSubmitByRole() && canSubmitByGeneration();
    }

    public abstract String getRoleName();

    public abstract String getProfile();

    public String getName() {
        return name;
    }

    public String getMajor() {
        return major;
    }

    public int getGeneration() {
        return generation;
    }

    public String getPart() {
        return part;
    }
}
