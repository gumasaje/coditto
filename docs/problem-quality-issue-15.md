# Issue #15 문제 콘텐츠 품질 기준과 재평가 기록

이 문서는 공개 문제를 고를 때 한 클래스의 길이가 학습 목표를 가리지 않도록 하는
검토 기준과, Issue #15에서 수행한 기존 문제 재평가 결과를 기록합니다. 수치는 자동
게시 조건이 아니라 사람이 문제를 검토할 때 사용하는 상한 가이드입니다. 예외는
학습 가치와 필요한 탐색 범위를 이 문서에 별도로 설명해야 합니다.

## 게시 기준

모든 공개 문제는 다음 조건을 만족해야 합니다.

- 증상, 기대 동작과 보존해야 할 회귀 동작을 statement만으로 설명할 수 있어야 한다.
- 수정 파일은 한 개이며, reference patch는 그 파일 안에서 원인을 직접 고쳐야 한다.
- `display.files`에는 원인 파악에 필요한 DTO, domain, repository, policy와 exception만
  명시한다. `candidate.allowedPaths`에 없는 파일은 API에서 `editable: false`여야 한다.
- build script, `judge-only/**`, reference patch와 공식 test는 조회 응답에 노출하지 않는다.
- buggy candidate는 target 실패·regression 통과, fixed candidate는 두 suite 통과를
  실제 격리 Docker Runner에서 반복 재현해야 한다.
- 기준 패치는 문제와 무관한 정리, 이름 변경이나 대규모 재구성을 포함하지 않는다.

난이도별 가이드는 다음과 같습니다. 줄 수는 공백과 import를 포함한 물리적 줄 수로
측정합니다.

| 난이도 | 편집 파일 | reference patch | 공개 문맥 | 예상 풀이 시간 |
| --- | ---: | ---: | ---: | ---: |
| 쉬움 | 70줄 이하 | 변경 8줄 이하 | 2~4개 파일 | 10~25분 |
| 보통 | 100줄 이하 | 변경 20줄 이하 | 3~7개 파일 | 20~45분 |
| 어려움 | 140줄 이하 | 변경 35줄 이하 | 4~10개 파일 | 40~60분 |

다음 후보는 게시하지 않습니다.

- 오타나 문법 한 글자만 찾아 바꾸면 되고 동작 근거를 설명할 필요가 없는 문제
- 긴 클래스에서 몇 줄을 찾는 시간이 디버깅 목표보다 큰 문제
- 공개 문맥에 없는 사내 규칙, 숨은 구현 지식이나 특정 답안 형태에 의존하는 문제
- target을 고치기 위해 회귀 동작을 약화하거나 공식 test 세부 내용을 알아야 하는 문제
- 외부 서비스, 시간, 무작위 값이나 공유 DB 상태 때문에 결과가 비결정적인 문제

## 기존 문제 재평가

| 문제 | 편집 파일 | 패치 | 결정 | 근거 및 조치 |
| --- | ---: | ---: | --- | --- |
| `role-update-001` | 10줄 | 1줄 | 개선 후 유지 | 승인 분기에서 잘못된 상태를 선택하는 쉬운 입문 문제다. 요청 의미를 별도 `RoleChangeRequest`로 분리해 읽기 전용 문맥으로 제공한다. |
| `member-list-exposure-001` | 61줄 | 1줄 | 개선 후 유지 | mutable 내부 상태 노출과 방어적 복사라는 학습 목표가 명확하고 회귀 범위도 작다. `MemberRepository` 인터페이스를 읽기 전용 문맥으로 추가한다. |
| `member-generation-validation-001` | 125줄 | 10줄 | 교체 | 두 update 경로를 찾기 위해 CRUD 전체를 읽어야 하고, 필요한 DTO·domain·repository가 화면에 없었다. 대체 문제 검증 후 패키지와 전용 testdata를 제거한다. |

## 대체 문제

`member-name-uniqueness-001`은 기존 Spring Data JPA/H2 Judge image와 단일 파일 제출
계약을 그대로 사용합니다. 편집 대상 `MemberService`는 32줄이고, 중복 이름을
판단하는 데 필요한 request, entity, repository와 두 exception을 읽기 전용으로
제공합니다.

reference patch는 repository의 `existsByNameAndIdNot` 계약을 사용해 다른 멤버가
사용 중인 이름만 거부합니다. target suite는 중복 변경과 기존 이름 보존을 검증하고,
regression suite는 현재 이름 유지, 사용하지 않는 이름으로 변경, not-found 예외와
H2 in-memory 경계를 검증합니다.

교체 순서는 다음과 같습니다.

1. 새 문제의 manifest, buggy/fixed candidate와 target/regression suite를 추가한다.
2. Spring Judge image를 새 문제로 seed하고 `--network none`에서 반복 검증한다.
3. Backend catalog가 편집 파일 하나와 읽기 전용 문맥을 정확히 반환하는지 검증한다.
4. 위 검증이 통과한 뒤 `member-generation-validation-001`과 전용 testdata를 제거한다.

2026-08-18 검증에서 새 문제의 buggy/fixed candidate를 각각 3회 실행해 target
실패·regression 통과와 두 suite 통과를 재현했습니다. H2 in-memory,
`--network none`, non-root image, 결과 JSON 반복 일치와 container cleanup을 확인한
뒤 기존 장문 문제 패키지와 전용 testdata를 제거했습니다.
