package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.InvalidMemberRequestException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.domain.RoleType;
import com.likelion.springboot.member.dto.LionUpdateRequest;
import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@Import(MemberService.class)
class LionUpdateRoleTargetTest {
    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    void rejectsLionUpdateForStaffMember() {
        Member staff = memberRepository.saveAndFlush(
                new Member("김운영", "경영학과", 13, "기획", RoleType.STAFF, null, "대표")
        );
        LionUpdateRequest request = new LionUpdateRequest("컴퓨터공학과", 14, "백엔드", "20262026");

        assertThrows(InvalidMemberRequestException.class, () -> memberService.updateLion(staff.getId(), request));

        Member stored = memberRepository.findById(staff.getId()).orElseThrow();
        assertEquals(RoleType.STAFF, stored.getRoleType());
        assertEquals("경영학과", stored.getMajor());
        assertEquals("대표", stored.getPosition());
        assertNull(stored.getStudentId());
    }
}
