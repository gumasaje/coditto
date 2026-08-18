package com.likelion.springboot.member.domain;

import com.likelion.springboot.assignment.domain.Assignment;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import com.likelion.springboot.member.repository.MemberRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
class MemberCascadeDeleteTargetTest {
    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void deletesAssignmentsTogetherWithTheirMember() {
        Member member = memberRepository.saveAndFlush(new Member("김사자"));
        assignmentRepository.saveAndFlush(new Assignment("Spring 과제", member));
        entityManager.clear();

        Member stored = memberRepository.findById(member.getId()).orElseThrow();

        assertDoesNotThrow(() -> {
            memberRepository.delete(stored);
            memberRepository.flush();
        });

        assertEquals(0, assignmentRepository.count());
    }
}
