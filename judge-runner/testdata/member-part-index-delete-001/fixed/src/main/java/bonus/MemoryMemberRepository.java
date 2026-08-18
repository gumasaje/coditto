package bonus;

import role.Role;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class MemoryMemberRepository implements MemberRepository {
    private final List<Role> members = new ArrayList<>();
    private final Map<String, List<Role>> membersByPart = new HashMap<>();

    @Override
    public void save(Role member) {
        members.add(member);
        membersByPart.computeIfAbsent(member.getPart(), ignored -> new ArrayList<>()).add(member);
    }

    @Override
    public Role findByName(String name) {
        for (Role member : members) {
            if (member.getName().equals(name)) {
                return member;
            }
        }
        return null;
    }

    @Override
    public List<Role> findAll() {
        return List.copyOf(members);
    }

    @Override
    public Set<String> findAllParts() {
        return Set.copyOf(membersByPart.keySet());
    }

    @Override
    public List<Role> findAllByPart(String part) {
        return List.copyOf(membersByPart.getOrDefault(part, List.of()));
    }

    @Override
    public boolean isDuplicate(String name) {
        return findByName(name) != null;
    }

    @Override
    public void deleteByName(Role member) {
        members.remove(member);

        List<Role> partMembers = membersByPart.get(member.getPart());
        if (partMembers != null) {
            partMembers.remove(member);
            if (partMembers.isEmpty()) {
                membersByPart.remove(member.getPart());
            }
        }
    }
}
