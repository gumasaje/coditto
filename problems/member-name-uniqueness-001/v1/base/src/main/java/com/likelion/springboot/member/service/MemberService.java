package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.MemberNotFoundException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.dto.MemberRenameRequest;
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
    public Member rename(Long id, MemberRenameRequest request) {
        Member member = repository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + id));

        member.rename(request.name());
        return repository.save(member);
    }

    public Member findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + id));
    }
}
