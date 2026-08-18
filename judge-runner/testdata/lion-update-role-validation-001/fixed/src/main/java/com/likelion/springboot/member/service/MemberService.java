package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.InvalidMemberRequestException;
import com.likelion.springboot.global.exception.MemberNotFoundException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.domain.RoleType;
import com.likelion.springboot.member.dto.LionUpdateRequest;
import com.likelion.springboot.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MemberService {
    private final MemberRepository repository;

    public MemberService(MemberRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Member updateLion(Long id, LionUpdateRequest request) {
        Member member = repository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + id));

        if (member.getRoleType() != RoleType.LION) {
            throw new InvalidMemberRequestException("아기사자만 아기사자 수정 요청을 사용할 수 있습니다.");
        }

        member.updateInfo(request.major(), request.generation(), request.part());
        member.updateStudentId(request.studentId());

        return repository.save(member);
    }
}
