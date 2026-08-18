package com.likelion.springboot.member.repository;

import com.likelion.springboot.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
    boolean existsByNameAndIdNot(String name, Long id);
}
