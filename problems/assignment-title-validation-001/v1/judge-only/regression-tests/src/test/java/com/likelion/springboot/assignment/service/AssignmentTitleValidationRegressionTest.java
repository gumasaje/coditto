package com.likelion.springboot.assignment.service;

import com.likelion.springboot.assignment.domain.Assignment;
import com.likelion.springboot.assignment.dto.AssignmentCreateRequest;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@Import(AssignmentService.class)
class AssignmentTitleValidationRegressionTest {
    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private DataSource dataSource;

    @Test
    void savesValidAssignmentForExistingMember() {
        Member member = memberRepository.saveAndFlush(new Member("김사자"));

        Assignment saved = assignmentService.create(
                member.getId(),
                new AssignmentCreateRequest("Spring 과제", "JPA 연관관계")
        );
        assignmentRepository.flush();

        assertEquals("Spring 과제", saved.getTitle());
        assertEquals("JPA 연관관계", saved.getDescription());
        assertEquals(member.getId(), saved.getMember().getId());
        assertEquals(1, assignmentRepository.count());
    }

    @Test
    void preservesMissingMemberBehavior() {
        assertThrows(
                NoSuchElementException.class,
                () -> assignmentService.create(999L, new AssignmentCreateRequest("과제", "설명"))
        );
    }

    @Test
    void usesAnInMemoryH2DataSource() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTrue(connection.getMetaData().getURL().startsWith("jdbc:h2:mem:"));
        }
    }
}
