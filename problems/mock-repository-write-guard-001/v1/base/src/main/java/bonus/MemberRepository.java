package bonus;

import role.Role;

import java.util.List;
import java.util.Set;

public interface MemberRepository {
    void save(Role member);

    Role findByName(String name);

    List<Role> findAll();

    Set<String> findAllParts();

    List<Role> findAllByPart(String part);

    boolean isDuplicate(String name);

    boolean isWritable();

    void deleteByName(Role member);
}
