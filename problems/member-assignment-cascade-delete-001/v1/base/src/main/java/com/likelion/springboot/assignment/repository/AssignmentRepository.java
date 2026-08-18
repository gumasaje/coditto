package com.likelion.springboot.assignment.repository;

import com.likelion.springboot.assignment.domain.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
}
