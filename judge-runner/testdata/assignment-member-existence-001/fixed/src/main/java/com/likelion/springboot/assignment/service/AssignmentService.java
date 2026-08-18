package com.likelion.springboot.assignment.service;

import com.likelion.springboot.assignment.domain.Assignment;
import com.likelion.springboot.assignment.repository.AssignmentRepository;
import com.likelion.springboot.global.exception.MemberNotFoundException;
import com.likelion.springboot.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AssignmentService {
    private final AssignmentRepository assignmentRepository;
    private final MemberRepository memberRepository;

    public AssignmentService(
            AssignmentRepository assignmentRepository,
            MemberRepository memberRepository
    ) {
        this.assignmentRepository = assignmentRepository;
        this.memberRepository = memberRepository;
    }

    public List<Assignment> findByMemberId(Long memberId) {
        if (!memberRepository.existsById(memberId)) {
            throw new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + memberId);
        }

        return assignmentRepository.findByMemberId(memberId);
    }
}
