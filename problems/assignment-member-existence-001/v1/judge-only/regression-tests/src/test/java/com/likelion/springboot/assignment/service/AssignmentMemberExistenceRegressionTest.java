package com.likelion.springboot.assignment.service;

import com.likelion.springboot.assignment.domain.Assignment;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@Import(AssignmentService.class)
class AssignmentMemberExistenceRegressionTest {
    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private DataSource dataSource;

    @Test
    void returnsEmptyListForExistingMemberWithoutAssignments() {
        Member member = memberRepository.saveAndFlush(new Member("김사자"));

        assertTrue(assignmentService.findByMemberId(member.getId()).isEmpty());
    }

    @Test
    void returnsAssignmentsOwnedByExistingMember() {
        Member member = memberRepository.saveAndFlush(new Member("김사자"));
        assignmentRepository.saveAndFlush(new Assignment("Spring 과제", member));

        assertEquals(1, assignmentService.findByMemberId(member.getId()).size());
    }

    @Test
    void usesAnInMemoryH2DataSource() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTrue(connection.getMetaData().getURL().startsWith("jdbc:h2:mem:"));
        }
    }
}
