# ADR 0001: 문제별 Judge 이미지 선택

- 상태: Accepted
- 날짜: 2026-08-12

## 맥락

기존 `role-update-001`과 일반 Java PBL 문제는 Java 21, Gradle 8.10.2,
JUnit만 필요하지만 Spring Boot/JPA 문제는 Spring plugin과 H2 의존성을 offline
Gradle cache에 추가로 준비해야 한다. 공용 Runner는 이미 problem manifest의
`runtime.image`를 Docker image 인자로 사용한다.

## 결정

- problem manifest의 `runtime.image`를 문제별 실행 이미지의 유일한 선택 기준으로
  사용한다.
- 일반 Java 문제는 기존 `coditto/judge-java21-gradle:8.10.2-phase-a`를 재사용한다.
- Spring Boot/JPA 문제는 sibling Dockerfile로
  `coditto/judge-java21-springboot:phase-a`를 빌드한다.
- 모든 Judge 이미지는 같은 immutable `execute.sh`와 `judge_entrypoint.py`, non-root
  user, offline Gradle 실행과 Runner의 Docker 격리 옵션을 사용한다.
- 의존성 차이는 image build 단계의 cache seed로만 해결하며 공용 Runner나 entrypoint에
  framework 분기를 추가하지 않는다.

## 결과

- 새 framework 의존성이 기존 Java image와 fixture를 변경하지 않는다.
- problem package를 게시하려면 manifest가 가리키는 image도 함께 준비해야 한다.
- 각 image의 의존성 cache와 problem package가 일치하는지 실제 `--network none`
  실행으로 검증해야 한다.
