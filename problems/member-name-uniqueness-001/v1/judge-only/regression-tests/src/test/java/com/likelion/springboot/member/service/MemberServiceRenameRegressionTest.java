package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.MemberNotFoundException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.dto.MemberRenameRequest;
import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@Import(MemberService.class)
class MemberServiceRenameRegressionTest {
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
    void allowsKeepingTheCurrentName() {
        Member member = memberRepository.saveAndFlush(new Member("김사자", "백엔드"));

        Member updated = memberService.rename(member.getId(), new MemberRenameRequest("김사자"));

        assertEquals("김사자", updated.getName());
        assertEquals("백엔드", updated.getPart());
    }

    @Test
    void persistsAnUnusedName() {
        Member member = memberRepository.saveAndFlush(new Member("김사자", "백엔드"));

        memberService.rename(member.getId(), new MemberRenameRequest("박사자"));
        memberRepository.flush();

        assertEquals("박사자", memberRepository.findById(member.getId()).orElseThrow().getName());
    }

    @Test
    void preservesTheNotFoundBehavior() {
        assertThrows(
                MemberNotFoundException.class,
                () -> memberService.rename(999L, new MemberRenameRequest("박사자"))
        );
    }
}
