package com.likelion.springboot.assignment.service;

import com.likelion.springboot.assignment.domain.Assignment;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
@Import(AssignmentService.class)
class AssignmentTitleSearchTargetTest {
    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Test
    void findsAssignmentsWhoseTitlesContainKeyword() {
        assignmentRepository.saveAllAndFlush(List.of(
                new Assignment("Spring 기초"),
                new Assignment("Spring 심화"),
                new Assignment("Java 기초")
        ));

        assertEquals(2, assignmentService.findByTitleContaining("Spring").size());
    }
}
