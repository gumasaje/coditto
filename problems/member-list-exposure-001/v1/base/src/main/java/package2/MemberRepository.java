package package2;

import role.Role;

import java.util.List;
import java.util.Set;

public interface MemberRepository {
    public void save(Role member);

    public Role findByName(String name);

    public List<Role> findAll();

    public Set<String> findAllParts();

    public List<Role> findAllByPart(String part);

    public boolean isDuplicate(String name);

    public boolean isWritable();
}
