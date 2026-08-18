package com.likelion.springboot.assignment.service;

import com.likelion.springboot.global.exception.MemberNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@Import(AssignmentService.class)
class AssignmentMemberExistenceTargetTest {
    @Autowired
    private AssignmentService assignmentService;

    @Test
    void rejectsAssignmentLookupForMissingMember() {
        assertThrows(MemberNotFoundException.class, () -> assignmentService.findByMemberId(999L));
    }
}
