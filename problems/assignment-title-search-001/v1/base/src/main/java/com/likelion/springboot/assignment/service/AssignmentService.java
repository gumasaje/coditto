package com.likelion.springboot.assignment.service;

import com.likelion.springboot.assignment.domain.Assignment;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AssignmentService {
    private final AssignmentRepository assignmentRepository;

    public AssignmentService(AssignmentRepository assignmentRepository) {
        this.assignmentRepository = assignmentRepository;
    }

    public List<Assignment> findByTitleContaining(String keyword) {
        return assignmentRepository.findByTitle(keyword);
    }
}
