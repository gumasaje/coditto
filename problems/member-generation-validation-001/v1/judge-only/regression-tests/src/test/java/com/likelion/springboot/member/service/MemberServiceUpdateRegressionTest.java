package com.likelion.springboot.member.service;

import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.domain.RoleType;
import com.likelion.springboot.member.dto.LionUpdateRequest;
import com.likelion.springboot.member.dto.StaffUpdateRequest;
import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@Import(MemberService.class)
class MemberServiceUpdateRegressionTest {
    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private DataSource dataSource;

    @Test
    void usesAnInMemoryH2DataSource() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTrue(connection.getMetaData().getURL().startsWith("jdbc:h2:mem:"));
        }
    }

    @Test
    void preservesValidLionUpdates() {
        Member member = memberRepository.saveAndFlush(
                new Member("김사자", "컴퓨터공학과", 14, "백엔드", RoleType.LION, "20260001", null)
        );
        LionUpdateRequest request = new LionUpdateRequest();
        ReflectionTestUtils.setField(request, "major", "소프트웨어학과");
        ReflectionTestUtils.setField(request, "generation", 15);
        ReflectionTestUtils.setField(request, "part", "프론트엔드");
        ReflectionTestUtils.setField(request, "studentId", "20269999");

        Member updated = memberService.updateLion(member.getId(), request);

        assertEquals("소프트웨어학과", updated.getMajor());
        assertEquals(15, updated.getGeneration());
        assertEquals("프론트엔드", updated.getPart());
        assertEquals("20269999", updated.getStudentId());
        assertEquals(RoleType.LION, updated.getRoleType());
    }

    @Test
    void preservesValidStaffUpdates() {
        Member member = memberRepository.saveAndFlush(
                new Member("이사자", "컴퓨터공학과", 13, "기획", RoleType.STAFF, null, "파트장")
        );
        StaffUpdateRequest request = new StaffUpdateRequest();
        ReflectionTestUtils.setField(request, "major", "경영학과");
        ReflectionTestUtils.setField(request, "generation", 14);
        ReflectionTestUtils.setField(request, "part", "디자인");
        ReflectionTestUtils.setField(request, "position", "대표");

        Member updated = memberService.updateStaff(member.getId(), request);

        assertEquals("경영학과", updated.getMajor());
        assertEquals(14, updated.getGeneration());
        assertEquals("디자인", updated.getPart());
        assertEquals("대표", updated.getPosition());
        assertEquals(RoleType.STAFF, updated.getRoleType());
    }
}
