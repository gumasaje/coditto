# Issue #6 PBL 문제 후보 선정 기록

> Issue #15 재평가에서 `member-generation-validation-001`은 편집 파일이 125줄이고
> 필요한 프로젝트 문맥을 표시하지 못해 교체 대상으로 결정했습니다. 현재 게시
> 기준과 대체 문제 선정 근거는 [Issue #15 문제 콘텐츠 품질 기준](problem-quality-issue-15.md)에
> 있습니다. 아래 Spring Boot 절은 최초 선정 당시의 기록입니다.

Issue #6의 두 문제는 공개 PBL 저장소를 정적으로 검토해 후보를 좁힌 뒤, 단일 수정
파일, 20줄 이내 기준 패치, 기존 Judge 계약 재사용, 결정론적인 target/regression
검증 가능성을 기준으로 선정했습니다.

## Java

- 게시 ID: `member-list-exposure-001`
- 원본: [`likelion-14th-pbl-java` `bd7d33f`](https://github.com/gumasaje/likelion-14th-pbl-java/commit/bd7d33f1932fecc965930511bee9e0630a4ba6b6)
- 검토 범위: `week-01`부터 `week-05`
- 선정 파일: `week-05/src/main/java/package2/MemoryMemberRepository.java`
- 선정 버그: `findAll()`이 mutable 내부 목록을 그대로 반환해 조회 결과를 수정한
  호출자가 repository 저장 상태를 손상시킵니다.

이 후보는 한 줄의 방어적 복사로 수정할 수 있고, 저장·이름 조회·중복 검사·파트
인덱스라는 기존 동작을 별도 regression suite로 검증할 수 있어 문제 경계가
명확합니다. 검토한 다른 후보 중 읽기 전용 repository 등록은 UI가 이미 차단하고
있었고, 존재하지 않는 파트 조회의 `null` 반환은 기존 호출부가 명시적으로 처리하고
있어 사용자 영향과 의도 판단이 상대적으로 약했습니다.

## Spring Boot

- 게시 ID: `member-generation-validation-001`
- 원본: [`likelion-14th-pbl-spring-boot` `95f726a`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/95f726a0451a84b6d898cc4825d3457008bc6df7)
- 검토 범위: `member`, `assignment` domain과 service/repository/JPA 경계
- 선정 파일: `src/main/java/com/likelion/springboot/member/service/MemberService.java`
- 선정 버그: 생성 경로는 기수가 1 이상인지 검증하지만 `updateLion`과
  `updateStaff`는 0 이하의 기수를 그대로 영속화합니다.

이 후보는 기존 생성 규칙과 수정 규칙의 불일치라 기대 동작이 분명하고, 공통 검증
호출 두 곳과 작은 helper만으로 수정할 수 있습니다. 실제 `MemberRepository`와 H2
in-memory DB를 사용하는 `@DataJpaTest`로 잘못된 값의 영속화를 재현하면서 외부
MySQL 없이 `--network none`을 유지할 수 있습니다. 역할이 다른 update endpoint를
호출하는 후보는 요구되는 오류 정책이 원본에 없었고, 중복 이름 경합 후보는 DB
constraint와 동시성 정책까지 필요해 단일 파일 문제 범위를 넘으므로 제외했습니다.
