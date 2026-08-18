package package1;

public class Lion {

    public String name;
    String major;
    private int generation;

    public Lion(String name, String major, int generation) {
        this.name = name;
        this.major = major;
        this.generation = generation;
    }

    public void validate() {
        validateName();
        validateMajor();
        validateGeneration();
    }

    private void validateName() {
        if (this.name == null || this.name.trim().isEmpty()) {
            throw new IllegalArgumentException("이름이 비어 있습니다.");
        }
    }

    private void validateMajor() {
        if (this.major == null || this.major.trim().isEmpty()) {
            throw new IllegalArgumentException("전공이 비어 있습니다.");
        }
    }

    private void validateGeneration() {
        if (this.generation < 1) {
            throw new IllegalArgumentException("기수는 1 이상이어야 합니다.");
        }
    }

    public int getGeneration() {
        return generation;
    }

    public void printProfile() {
        System.out.printf("👤이름: %s | 🎓전공: %s | 📌기수: %d%n", name, major, generation);
    }
}
