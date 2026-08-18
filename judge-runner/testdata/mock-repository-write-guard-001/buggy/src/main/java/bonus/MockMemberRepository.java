package bonus;

import role.Lion;
import role.Role;
import role.Staff;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class MockMemberRepository implements MemberRepository {
    private final List<Role> dummyList = new ArrayList<>();
    private final Map<String, List<Role>> dummyMap = new HashMap<>();

    public MockMemberRepository() {
        dummyList.add(new Lion("김사자", "컴퓨터공학과", 14, "백엔드", "20202020"));
        dummyList.add(new Lion("최사자", "컴퓨터공학과", 13, "프론트엔드", "20192019"));
        dummyList.add(new Staff("홍사자", "컴퓨터공학과", 12, "기획", "대표"));
        dummyList.add(new Staff("구사자", "컴퓨터공학과", 11, "디자인", "멘토"));

        for (Role member : dummyList) {
            dummyMap.computeIfAbsent(member.getPart(), ignored -> new ArrayList<>()).add(member);
        }
    }

    @Override
    public void save(Role member) {
    }

    @Override
    public Role findByName(String name) {
        for (Role role : dummyList) {
            if (role.getName().equals(name)) {
                return role;
            }
        }
        return null;
    }

    @Override
    public List<Role> findAll() {
        return List.copyOf(dummyList);
    }

    @Override
    public Set<String> findAllParts() {
        return Set.copyOf(dummyMap.keySet());
    }

    @Override
    public List<Role> findAllByPart(String part) {
        return List.copyOf(dummyMap.getOrDefault(part, List.of()));
    }

    @Override
    public boolean isDuplicate(String name) {
        return false;
    }

    @Override
    public boolean isWritable() {
        return false;
    }

    @Override
    public void deleteByName(Role member) {
    }
}
