package com.likelion.springboot.assignment.service;

import com.likelion.springboot.assignment.dto.AssignmentCreateRequest;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import com.likelion.springboot.global.exception.InvalidAssignmentRequestException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@Import(AssignmentService.class)
class AssignmentTitleValidationTargetTest {
    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Test
    void rejectsBlankOrMissingTitleWithoutSaving() {
        Member member = memberRepository.saveAndFlush(new Member("김사자"));

        assertThrows(
                InvalidAssignmentRequestException.class,
                () -> assignmentService.create(member.getId(), new AssignmentCreateRequest(" ", "설명"))
        );
        assertThrows(
                InvalidAssignmentRequestException.class,
                () -> assignmentService.create(member.getId(), new AssignmentCreateRequest(null, "설명"))
        );

        assertEquals(0, assignmentRepository.count());
    }
}
