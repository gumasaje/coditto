package package2;

import role.Role;

import java.util.*;

public class MemoryMemberRepository implements MemberRepository {
    private final List<Role> members = new ArrayList<>();
    private final Map<String, List<Role>> membersByPart = new HashMap<>();

    @Override
    public void save(Role member) {
        members.add(member);

        String part = member.getPart();
        if (!membersByPart.containsKey(part)) {
            membersByPart.put(part, new ArrayList<>());
        }
        membersByPart.get(part).add(member);
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
        return members;
    }

    @Override
    public Set<String> findAllParts() {
        return membersByPart.keySet();
    }

    @Override
    public List<Role> findAllByPart(String part) {
        return membersByPart.get(part);
    }

    @Override
    public boolean isDuplicate(String name) {
        for (Role member : members) {
            if (member.getName().equals(name)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public boolean isWritable() {
        return true;
    }
}
