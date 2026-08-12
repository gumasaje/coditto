package com.likelion.springboot.member.service;

import com.likelion.springboot.global.exception.InvalidMemberRequestException;
import com.likelion.springboot.global.exception.DuplicateMemberException;
import com.likelion.springboot.global.exception.MemberNotFoundException;
import com.likelion.springboot.member.domain.Member;
import com.likelion.springboot.member.domain.RoleType;
import com.likelion.springboot.member.dto.LionCreateRequest;
import com.likelion.springboot.member.dto.LionUpdateRequest;
import com.likelion.springboot.member.dto.StaffCreateRequest;
import com.likelion.springboot.member.dto.StaffUpdateRequest;
import com.likelion.springboot.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MemberService {
    private final MemberRepository repository;

    // @Autowired
    public MemberService(MemberRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Member createLion(LionCreateRequest lionCreateRequest) {
        validateCreateRequest(lionCreateRequest.getName(), lionCreateRequest.getGeneration());

        Member member = new Member(
                lionCreateRequest.getName(),
                lionCreateRequest.getMajor(),
                lionCreateRequest.getGeneration(),
                lionCreateRequest.getPart(),
                RoleType.LION,
                lionCreateRequest.getStudentId(),
                null
        );

        return repository.save(member);
    }

    @Transactional
    public Member createStaff(StaffCreateRequest staffCreateRequest) {
        validateCreateRequest(staffCreateRequest.getName(), staffCreateRequest.getGeneration());

        Member member = new Member(
                staffCreateRequest.getName(),
                staffCreateRequest.getMajor(),
                staffCreateRequest.getGeneration(),
                staffCreateRequest.getPart(),
                RoleType.STAFF,
                null,
                staffCreateRequest.getPosition()
        );

        return repository.save(member);
    }

    @Transactional
    public Member updateLion(Long id, LionUpdateRequest lionUpdateRequest) {
        Member member = repository.findById(id).orElseThrow(() -> new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + id));

        member.updateInfo(lionUpdateRequest.getMajor(), lionUpdateRequest.getGeneration(), lionUpdateRequest.getPart());
        member.updateStudentId(lionUpdateRequest.getStudentId());

        return repository.save(member);
    }

    @Transactional
    public Member updateStaff(Long id, StaffUpdateRequest staffUpdateRequest) {
        Member member = repository.findById(id).orElseThrow(() -> new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + id));

        member.updateInfo(staffUpdateRequest.getMajor(), staffUpdateRequest.getGeneration(), staffUpdateRequest.getPart());
        member.updatePosition(staffUpdateRequest.getPosition());

        return repository.save(member);
    }

    @Transactional
    public boolean deleteMember(Long id) {
        if (!repository.existsById(id)) {
            throw new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + id);
        }

        repository.deleteById(id);
        return true;
    }

    public Member searchByName(String name) {
        return repository.findByName(name).orElseThrow(() -> new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. name: " + name));
    }

    public List<Member> getAllMembers() {
        return repository.findAll();
    }

    public Member findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new MemberNotFoundException("해당 멤버를 찾을 수 없습니다. id: " + id));
    }

    public List<Member> findByPart(String part) {
        return repository.findByPart(part);
    }

    public boolean isEmpty() {
        return repository.findAll().isEmpty();
    }

    private void validateCreateRequest(String name, int generation) {
        if (name == null || name.isBlank()) {
            throw new InvalidMemberRequestException("이름은 비어 있을 수 없습니다.");
        }

        if (generation <= 0) {
            throw new InvalidMemberRequestException("기수는 1 이상이어야 합니다.");
        }

        if (repository.existsByName(name)) {
            throw new DuplicateMemberException("이미 존재하는 이름입니다. name: " + name);
        }
    }
}
