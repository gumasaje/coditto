package policy;

public class GenerationSubmissionPolicy implements SubmissionPolicy {
    public static final int MIN_GEN = 14;

    private final int userGen;

    public GenerationSubmissionPolicy(int userGen) {
        this.userGen = userGen;
    }

    @Override
    public boolean canSubmit() {
        return userGen >= MIN_GEN;
    }
}
