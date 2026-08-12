package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.InvalidMemberRequestException;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@Import(MemberService.class)
class MemberServiceUpdateValidationTargetTest {
    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    void rejectsNonPositiveGenerationBeforeUpdatingLion() {
        Member member = memberRepository.saveAndFlush(
                new Member("김사자", "컴퓨터공학과", 14, "백엔드", RoleType.LION, "20260001", null)
        );
        LionUpdateRequest request = lionUpdateRequest(0);

        assertThrows(
                InvalidMemberRequestException.class,
                () -> memberService.updateLion(member.getId(), request)
        );

        assertEquals(14, memberRepository.findById(member.getId()).orElseThrow().getGeneration());
    }

    @Test
    void rejectsNonPositiveGenerationBeforeUpdatingStaff() {
        Member member = memberRepository.saveAndFlush(
                new Member("이사자", "컴퓨터공학과", 13, "기획", RoleType.STAFF, null, "파트장")
        );
        StaffUpdateRequest request = staffUpdateRequest(-1);

        assertThrows(
                InvalidMemberRequestException.class,
                () -> memberService.updateStaff(member.getId(), request)
        );

        assertEquals(13, memberRepository.findById(member.getId()).orElseThrow().getGeneration());
    }

    private LionUpdateRequest lionUpdateRequest(int generation) {
        LionUpdateRequest request = new LionUpdateRequest();
        ReflectionTestUtils.setField(request, "major", "소프트웨어학과");
        ReflectionTestUtils.setField(request, "generation", generation);
        ReflectionTestUtils.setField(request, "part", "프론트엔드");
        ReflectionTestUtils.setField(request, "studentId", "20269999");
        return request;
    }

    private StaffUpdateRequest staffUpdateRequest(int generation) {
        StaffUpdateRequest request = new StaffUpdateRequest();
        ReflectionTestUtils.setField(request, "major", "경영학과");
        ReflectionTestUtils.setField(request, "generation", generation);
        ReflectionTestUtils.setField(request, "part", "디자인");
        ReflectionTestUtils.setField(request, "position", "대표");
        return request;
    }
}
