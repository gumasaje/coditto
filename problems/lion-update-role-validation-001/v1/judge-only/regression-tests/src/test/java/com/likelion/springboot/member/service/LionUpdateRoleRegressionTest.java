package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.MemberNotFoundException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.domain.RoleType;
import com.likelion.springboot.member.dto.LionUpdateRequest;
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
class LionUpdateRoleRegressionTest {
    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private DataSource dataSource;

    @Test
    void updatesLionAndKeepsItsRole() {
        Member lion = memberRepository.saveAndFlush(
                new Member("김사자", "경영학과", 13, "기획", RoleType.LION, "20202020", null)
        );

        Member updated = memberService.updateLion(
                lion.getId(),
                new LionUpdateRequest("컴퓨터공학과", 14, "백엔드", "20262026")
        );

        assertEquals(RoleType.LION, updated.getRoleType());
        assertEquals("컴퓨터공학과", updated.getMajor());
        assertEquals(14, updated.getGeneration());
        assertEquals("백엔드", updated.getPart());
        assertEquals("20262026", updated.getStudentId());
    }

    @Test
    void preservesNotFoundBehavior() {
        assertThrows(
                MemberNotFoundException.class,
                () -> memberService.updateLion(
                        999L,
                        new LionUpdateRequest("컴퓨터공학과", 14, "백엔드", "20262026")
                )
        );
    }

    @Test
    void usesAnInMemoryH2DataSource() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTrue(connection.getMetaData().getURL().startsWith("jdbc:h2:mem:"));
        }
    }
}
