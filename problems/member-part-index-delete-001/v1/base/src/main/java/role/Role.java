package role;

public abstract class Role {
    private final String name;
    private final String part;

    protected Role(String name, String part) {
        this.name = name;
        this.part = part;
    }

    public String getName() {
        return name;
    }

    public String getPart() {
        return part;
    }
}
