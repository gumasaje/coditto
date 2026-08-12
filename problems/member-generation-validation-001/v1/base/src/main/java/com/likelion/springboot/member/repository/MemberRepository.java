package com.likelion.springboot.member.repository;

import com.likelion.springboot.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByName(String name);

    boolean existsByName(String name);

    List<Member> findByPart(String part);
}
