package com.likelion.springboot.assignment.service;

import com.likelion.springboot.assignment.domain.Assignment;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@Import(AssignmentService.class)
class AssignmentTitleSearchRegressionTest {
    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private DataSource dataSource;

    @Test
    void keepsExactTitleAndMissingKeywordBehavior() {
        assignmentRepository.saveAllAndFlush(List.of(
                new Assignment("Java 기초"),
                new Assignment("Spring 기초")
        ));

        assertEquals(1, assignmentService.findByTitleContaining("Java 기초").size());
        assertTrue(assignmentService.findByTitleContaining("Kotlin").isEmpty());
    }

    @Test
    void usesAnInMemoryH2DataSource() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTrue(connection.getMetaData().getURL().startsWith("jdbc:h2:mem:"));
        }
    }
}
