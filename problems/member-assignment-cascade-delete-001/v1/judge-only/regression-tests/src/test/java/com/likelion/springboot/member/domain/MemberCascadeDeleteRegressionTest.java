package com.likelion.springboot.member.domain;

import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
class MemberCascadeDeleteRegressionTest {
    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private DataSource dataSource;

    @Test
    void deletesMemberWithoutAssignments() {
        Member member = memberRepository.saveAndFlush(new Member("김사자"));

        memberRepository.delete(member);
        memberRepository.flush();

        assertEquals(0, memberRepository.count());
    }

    @Test
    void usesAnInMemoryH2DataSource() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTrue(connection.getMetaData().getURL().startsWith("jdbc:h2:mem:"));
        }
    }
}
