package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.DuplicateMemberException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.dto.MemberRenameRequest;
import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@Import(MemberService.class)
class MemberServiceRenameTargetTest {
    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    void rejectsANameAlreadyUsedByAnotherMember() {
        memberRepository.saveAndFlush(new Member("김사자", "백엔드"));
        Member target = memberRepository.saveAndFlush(new Member("이사자", "프론트엔드"));

        assertThrows(
                DuplicateMemberException.class,
                () -> memberService.rename(target.getId(), new MemberRenameRequest("김사자"))
        );

        assertEquals("이사자", memberRepository.findById(target.getId()).orElseThrow().getName());
    }
}
