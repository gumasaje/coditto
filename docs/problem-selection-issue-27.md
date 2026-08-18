# Issue #27 PBL 문제 카탈로그 확장 기록

Issue #27은 Issue #6에서 사용한 두 공개 PBL 저장소를 현재
[문제 콘텐츠 품질 기준](problem-quality-issue-15.md)으로 다시 검토했습니다. 원본에
남아 있는 결함만 찾는 데 한정하지 않고, 주차별 개선 전후 차이와 원본 도메인에서
재현 가능한 회귀도 후보로 만들었습니다. 각 문제의 출처는 아래 세 유형으로 구분합니다.

- **원본 동작:** 해당 commit의 코드에서 실제로 관찰되는 동작을 문제 경계로 삼습니다.
- **단계 차이:** 이후 PBL commit에서 개선된 이전 단계의 동작을 재현합니다.
- **검토된 회귀:** 원본의 올바른 로직에 한 가지 결함만 주입해 회귀 수정 문제로 만듭니다.

검토 기준 commit은 순수 Java 저장소의
[`bd7d33f`](https://github.com/gumasaje/likelion-14th-pbl-java/commit/bd7d33f1932fecc965930511bee9e0630a4ba6b6)와
Spring Boot 저장소의
[`95f726a`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/95f726a0451a84b6d898cc4825d3457008bc6df7)입니다.
주차별 단계 차이를 확인할 때만 아래 표의 이전 commit을 함께 사용했습니다.

## 선정 문제

| 문제 | 출처 | 편집 파일 | 패치 | 공개 파일 | 선정 근거 |
| --- | --- | ---: | ---: | ---: | --- |
| `lion-constructor-validation-001` | 원본 동작 · [`53d6501`](https://github.com/gumasaje/likelion-14th-pbl-java/commit/53d65012bc92540bde721ff394701c9a8683555e) | 46줄 | +1 | 1 | 생성 뒤 별도 `validate()` 호출을 요구해 잘못된 상태의 객체가 존재할 수 있습니다. [`22b2dd9`](https://github.com/gumasaje/likelion-14th-pbl-java/commit/22b2dd9d7f3e3417167bcf6fecacb8d196895063)의 생성 시 검증과 비교해 기대 동작이 분명합니다. 편집 파일 하나만으로 도메인 불변식이 완결되므로 별도 읽기 전용 파일을 만들지 않습니다. |
| `submission-policy-conjunction-001` | 검토된 회귀 · [`36224f6`](https://github.com/gumasaje/likelion-14th-pbl-java/commit/36224f62767bd91dc7883cb2ccdfc4aa13774ff4) | 37줄 | +1/-1 | 7 | 역할 정책과 기수 정책의 합성 지점을 `Role` 한 곳에서 고칠 수 있고, 두 정책을 각각 실패시키는 target으로 `AND` 의미를 판정할 수 있습니다. |
| `mock-repository-write-guard-001` | 원본 동작 · [`bd7d33f`](https://github.com/gumasaje/likelion-14th-pbl-java/commit/bd7d33f1932fecc965930511bee9e0630a4ba6b6) | 70줄 | +2 | 5 | `isWritable()`은 거짓이지만 `save`와 `deleteByName`은 조용히 끝납니다. UI 사전 확인을 우회해도 저장소 자체가 읽기 전용 계약을 명시적으로 지키도록 경계를 잡았습니다. |
| `member-part-index-delete-001` | 검토된 회귀 · [`171aa94`](https://github.com/gumasaje/likelion-14th-pbl-java/commit/171aa949f090bf0da7e5570f656be70c023ae082) | 55줄 | +7 | 4 | 전체 목록과 파트 인덱스를 함께 관리하는 원본 삭제 로직에서 인덱스 갱신만 제거했습니다. 같은 파트의 다른 멤버와 다른 파트를 보존하는 회귀 범위가 명확합니다. |
| `member-assignment-cascade-delete-001` | 단계 차이 · [`ac82010^`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/ac82010e4878888c9beda3f96738fd7c7ebcd1d5) → [`ac82010`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/ac82010e4878888c9beda3f96738fd7c7ebcd1d5) | 38줄 | +2/-1 | 4 | 과제가 있는 멤버 삭제를 실제 JPA 외래 키 제약으로 재현하고, 일대다 연관관계의 삭제 전파 설정 한 곳으로 해결합니다. |
| `assignment-member-existence-001` | 원본 동작 · [`95f726a`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/95f726a0451a84b6d898cc4825d3457008bc6df7) | 28줄 | +4 | 6 | 존재하지 않는 멤버와 과제가 없는 기존 멤버를 같은 빈 목록으로 반환합니다. 두 repository의 책임을 읽고 상위 리소스 존재 여부를 먼저 검증하는 문제로 분리했습니다. |
| `lion-update-role-validation-001` | 원본 동작 · [`95f726a`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/95f726a0451a84b6d898cc4825d3457008bc6df7) | 29줄 | +5 | 7 | 아기사자 수정 경로가 운영진 ID도 받아 역할별 필드를 섞을 수 있습니다. 전체 125줄 CRUD 서비스 대신 `updateLion`만 남겨 역할 검증에 필요한 문맥을 제한했습니다. |
| `assignment-title-validation-001` | 원본 동작 · [`95f726a`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/95f726a0451a84b6d898cc4825d3457008bc6df7) | 31줄 | +7 | 7 | Frontend는 빈 제목을 막지만 서비스는 검증하지 않습니다. API를 직접 호출해 공백과 `null` 제목이 저장되는 경로를 H2로 재현합니다. |
| `assignment-title-search-001` | 검토된 회귀 · [`b6ac84f`](https://github.com/gumasaje/likelion-14th-pbl-spring-boot/commit/b6ac84fe9d64fc88a6df2243985985ca62cbccae) | 22줄 | +1/-1 | 3 | 정확 일치와 포함 검색 repository 메서드가 함께 있는 원본에서 서비스 호출만 정확 일치로 되돌렸습니다. 부분 검색과 기존 정확 일치·미일치 동작을 독립적으로 판정할 수 있습니다. |

모든 문제는 수정 가능한 파일이 하나이며 기준 패치는 그 파일 안에서 원인을 직접
고칩니다. Spring 문제는 외부 MySQL 설정과 원본 `ApplicationTests`를 포함하지 않고
Spring Data JPA와 H2 in-memory만 사용합니다.

## 카탈로그 메타데이터

`stack`은 일반 Java 문제에 `Java`, Spring Data JPA가 필요한 문제에
`Java · Spring`을 사용합니다. `bugType`은 화면에서 증상을 구분할 수 있도록 입력
검증, 조건 결합, 쓰기 제어, 상태 동기화, 연관 삭제, 존재 검증, 역할 검증과 검색
조건으로 나눴습니다.

기존 `role-update-001`은 Spring API나 annotation을 사용하지 않으므로 `stack`을
`Java · Spring`에서 `Java`로 고쳤습니다. 승인 분기에서 잘못된 값을 선택하는 원인에
맞춰 `bugType`은 `상태 보존`에서 `조건 분기`, 예상 시간은 쉬움 가이드에 맞는
15분으로 조정했습니다.

## 제외한 주요 후보

| 후보 | 제외 이유 |
| --- | --- |
| `findAllParts()`와 `findAllByPart()`의 mutable view | 기존 `member-list-exposure-001`과 상태 노출·방어적 복사라는 학습 목표가 겹칩니다. |
| `Lion.name`의 `public` 접근 제어 | 한 접근 제한자와 reflection assertion에 답이 과도하게 고정되고 생성자 불변식 문제보다 동작 근거가 약합니다. |
| 멤버 수정의 기수 검증 | Issue #15에서 긴 CRUD 탐색 문제로 제거한 후보와 학습 목표가 같습니다. 같은 내용을 다시 게시하지 않습니다. |
| 존재하지 않는 파트 조회의 `null` | 원본 호출부가 `null`을 명시적으로 처리해 오류 정책을 새로 정하지 않고는 결함이라고 단정하기 어렵습니다. |
| 이름 중복의 DB constraint와 동시성 | 경합 정책과 schema 변경이 필요해 단일 Java 수정 파일 범위를 벗어납니다. |
| Controller 상태 코드와 전역 예외 매핑 | Spring Web test dependency와 HTTP 계약까지 확장해야 하므로 현재 JPA/H2 sibling image의 문제 묶음과 분리할 필요가 있습니다. |
| 정적 HTML/JavaScript 렌더링의 입력 escaping | JavaScript 제출과 Node 기반 Judge가 없어 새 언어·Runner 제외 범위에 해당합니다. |
| `ddl-auto`와 외부 MySQL 설정 | 공유 DB 상태와 실행 환경에 결과가 의존해 결정론적인 offline Judge 문제로 게시할 수 없습니다. |

## 검증

2026년 8월 18일 Docker 29.7.2 환경에서 다음을 확인했습니다.

- 신규 문제의 buggy/fixed candidate를 패키지 작성 직후 각각 한 번 실행해 buggy는
  target 실패·regression 통과, fixed는 두 suite 통과로 갈리는지 먼저 확인했습니다.
- 공개 문제 12개의 `reference.patch`를 각 base에 적용하고, 허용된 편집 파일이 fixed
  candidate와 바이트 단위로 일치하는지 확인했습니다.
- `python3 -m unittest discover -s judge-runner/tests -v`의 Runner 단위 테스트 28개와
  `(cd backend && ./gradlew test)`를 통과했습니다.
- `python3 -B judge-runner/verify_pbl_problems.py`로 공개 PBL 문제 11개의 buggy/fixed를
  각각 3회, 총 66회 실행했습니다. 모든 buggy는 `TESTS_FAILED`이면서 target 실패·
  regression 통과, 모든 fixed는 `TESTS_PASSED`이면서 두 suite 통과로 반복 JSON이
  일치했습니다.
- 같은 검증에서 기존 Java image 재사용, Spring 문제의 H2 in-memory 사용,
  `--network none`, non-root 실행, 공식 테스트 상세 비노출과 남은 Judge container가
  없음을 확인했습니다.
