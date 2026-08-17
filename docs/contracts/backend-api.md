# Backend API 계약: 문제 조회와 제출

**상태:** Draft v0 — 문제 조회, problemId 기반 제출, 면접 질문 API 구현

이 문서는 Frontend가 호출하는 Spring API의 계약을 정의합니다. 그 밑단에서 사용자 코드를 실행하는 Runner의 계약은 [Judge 입출력 명세](judge.md)가 소유합니다. 구현 순서와 모노레포 경계는 [기술 아키텍처](../ARCHITECTURE.md)가 소유합니다.

현재 저장소에는 기동 시 `problems/`를 한 번 스캔하는 메모리 인덱스, `GET /api/problems`, `GET /api/problems/{problemId}`, problemId와 선택 version을 받는 `POST /api/submissions`, `POST /api/interview-questions`가 구현돼 있습니다. "여력 되면" 절은 아직 구현되지 않았습니다.

## 범위와 상태

1단계 필수 범위는 8/7에 확정된 해커톤 MVP 중 API가 필요한 부분입니다.

| 범위 | 내용 | 상태 |
| --- | --- | --- |
| 1단계 필수 | 문제 목록 조회, 문제 상세 조회, `problemId`를 받는 제출, 목표/회귀 실패 구분, 면접 질문 카드 | 구현 |
| 여력 되면 | 사용자 테스트 제출과 `VERIFIED`, Bug Vaccine, Patch Autopsy | 설계 초안 · 이번 1단계에는 만들지 않음 |
| 제외 | 브라우저 작업공간, 사용자 에이전트 로그인, 서비스 로그인·회원가입, PostgreSQL, 세션 기반 비동기 제출 API | 이 문서 범위 밖 |

"여력 되면" 절의 설계는 화면 흐름과 모순되지 않는지 확인하기 위한 초안이며 구현 약속이 아닙니다. 해당 필드는 1단계 응답에 존재하지 않으며, 존재하지 않는 필드를 Frontend가 선택적으로라도 읽지 않습니다.

콘텐츠를 늘리는 방법(기존 Spring 과제 저장소에서 후보를 골라 오프라인 검증 후 수동 게시)은 작업 프로세스이지 API가 아니므로 이 문서 범위 밖입니다. 이 문서는 "문제가 여러 개일 수 있다"는 전제만 계약에 반영합니다. 1단계에서 추가하는 문제는 지금 `role-update-001`과 같은 Java 21/Gradle/JUnit 패키지 구조와 같은 Judge Runner를 그대로 재사용합니다. 새 언어·프레임워크 Runner는 추가하지 않습니다.

## judge.md와의 경계

`judge.md`는 프로세스 경계 하나를 정의합니다. Runner는 `--problem-id`, `--version`, `--candidate` 디렉터리를 인자로 받아 격리된 Docker 안에서 사용자 코드를 실행하고, stdout에 정규화된 계약 JSON 한 줄을 출력합니다. 이 문서는 그 위의 HTTP 경계를 정의합니다. API는 HTTP 요청을 Runner 입력(임시 candidate 디렉터리 + 문제 식별자)으로 번역하고, Runner가 돌려준 계약 JSON을 shape 검증한 뒤 그대로 응답 본문으로 사용합니다. API는 build output을 verdict로 해석하지 않고, Runner diagnostics(stderr)를 응답에 전달하지 않으며, 제출 코드를 API 프로세스에서 load하거나 실행하지 않습니다. 따라서 `runStatus`·`execution`·`error.kind`의 의미는 이 문서가 정의하지 않고 `judge.md`를 참조하며, 이 문서는 어떤 HTTP status로 감싸는지와 조회 엔드포인트만 정의합니다. 아래 5.3의 `check.suites`처럼 Judge 결과 JSON의 형태를 바꾸는 변경은 이 문서가 아니라 `judge.md` revision이 소유합니다.

## 데이터 모델과 저장소 판단

**1단계에 DB를 추가하지 않습니다.** 판단 기준은 "필요해지는 시점에 최소로 추가한다"이며, 아래 세 조회 축이 모두 파일로 충족됩니다.

- 문제 정의는 `problems/{problem-id}/v{n}/` 디렉터리에만 존재하고 Git이 유일한 원본입니다. 게시는 커밋과 배포로 이루어지므로 런타임 쓰기가 없습니다.
- 목록과 상세는 read-only이고, 1단계 문제 수는 한 자릿수입니다. API 기동 시 `problems/`를 한 번 스캔해 메모리 인덱스를 만들면 요청당 파일시스템 접근 없이 응답할 수 있습니다.
- 제출은 동기 호출이며 결과를 같은 응답으로 반환합니다. 서버가 결과를 보관해야 할 후속 조회가 1단계에 없습니다.

클릭 프로토타입의 진행률 카드(`N / M`)는 DB를 요구하지 않습니다. 로그인이 범위 밖이라 서버에는 진행률을 귀속시킬 주체가 없습니다. 1단계 진행률은 브라우저 `localStorage`의 클라이언트 상태이며 API 계약에 포함하지 않습니다.

DB가 필요해지는 시점은 다음 중 하나가 확정될 때이고, 그 전에는 넣지 않습니다.

- 제출 이력을 나중에 다시 조회해야 할 때(결과 영속화)
- 서비스 로그인이 생겨 진행률·상태를 사용자에 귀속시켜야 할 때
- 제출이 비동기로 바뀌어 `submissionId`로 폴링해야 할 때(작업 상태 저장)

### 카탈로그 메타데이터

목록 화면에 필요한 제목·카테고리·기술 스택·난이도는 `manifest.yaml`의 최상위 `catalog` 블록에 둡니다.

```json
{
  "schemaVersion": "draft-v0",
  "problem": { "id": "role-update-001", "version": 1 },
  "catalog": {
    "title": "회원 권한 수정 시 기존 관리자 권한이 사라져요",
    "category": "Backend",
    "stack": "Java · Spring",
    "bugType": "상태 보존",
    "estimatedMinutes": 30,
    "difficulty": "EASY"
  },
  "display": {
    "files": ["src/main/java/com/coditto/demo/RoleService.java"]
  },
  "runtime": { "...": "기존과 동일" },
  "candidate": { "...": "기존과 동일" }
}
```

두 블록은 최상위에만 추가하며 기존 `problem` 객체 안에는 어떤 키도 넣지 않습니다. Runner의 `validate_manifest_identity`가 `manifest["problem"]`을 요청값과 **정확히 같은 dict인지** 비교하므로, `problem` 안에 키를 하나라도 추가하면 모든 제출이 `SYSTEM_FAILED`/`CONTENT_ERROR`가 됩니다. 반면 `load_manifest`는 알 수 없는 최상위 키를 거부하지 않으므로 최상위 추가는 Runner를 수정하지 않고 안전합니다.

`catalog`와 `display`는 API만 읽고 Runner는 읽지 않습니다. Runner가 이 값을 판정에 사용하지 않는다는 점이 경계입니다.

## 공개 경계

조회 API가 노출하는 파일은 `manifest.display.files`의 명시적 allowlist뿐입니다. "`base/` 전체를 노출한다"는 암묵 규칙은 채택하지 않습니다. `base/build.gradle`은 test sourceSet을 `/judge-tests/target-tests`, `/judge-tests/regression-tests`로 덮어쓰고 있어 그대로 노출하면 숨은 테스트의 배치가 드러납니다.

`judge-only/` 아래의 target test, regression test, `reference.patch`는 어떤 조회 응답에도, 어떤 오류 메시지에도, 면접 질문 생성 프롬프트에도 포함하지 않습니다. 이는 `judge.md`가 정의한 runtime 경계를 HTTP 경계에서도 유지한다는 뜻입니다.

## 1단계 필수 엔드포인트

모든 응답은 `application/json`입니다. 조회 엔드포인트는 Judge 결과 계약(`runStatus`)을 사용하지 않습니다. `runStatus`는 Judge가 자신의 실행 책임을 완료했는지를 뜻하므로, 사용자 코드를 실행하지 않는 조회에 붙이면 의미가 오염됩니다.

### GET /api/problems

문제 목록 화면(catalog)이 사용합니다.

응답 `200`:

```json
{
  "categories": ["Backend", "Frontend", "Data·AI"],
  "problems": [
    {
      "id": "role-update-001",
      "version": 1,
      "title": "회원 권한 수정 시 기존 관리자 권한이 사라져요",
      "category": "Backend",
      "stack": "Java · Spring",
      "bugType": "상태 보존",
      "estimatedMinutes": 30,
      "difficulty": "EASY"
    }
  ]
}
```

`problems`에는 저장소에 실제로 존재하고 manifest 검증을 통과한 문제만 담습니다. 프로토타입의 "준비 중" 행은 존재하지 않는 문제이므로 API가 반환하지 않습니다. 카테고리 탭은 `categories`로 그리고, 해당 카테고리에 항목이 없으면 Frontend가 빈 상태를 표시합니다. API가 존재하지 않는 문제를 존재한다고 말하지 않는다는 원칙입니다.

`difficulty`는 `EASY` · `MEDIUM` · `HARD`입니다. 정렬은 목록 순서를 그대로 사용하고 서버가 정렬 파라미터를 받지 않습니다. 프로토타입의 상세 필터 칩은 1단계에서 클라이언트 필터이며 쿼리 파라미터를 추가하지 않습니다.

### GET /api/problems/{problemId}

작업공간 화면이 사용합니다. Incident 패널과 파일 탐색기를 한 번의 호출로 채웁니다.

응답 `200`:

```json
{
  "id": "role-update-001",
  "version": 1,
  "title": "회원 권한 수정 시 기존 관리자 권한이 사라져요",
  "category": "Backend",
  "difficulty": "EASY",
  "estimatedMinutes": 30,
  "statement": "# 역할 변경 승인 버그\n\n…statement.md 원문…",
  "files": [
    {
      "path": "src/main/java/com/coditto/demo/RoleService.java",
      "editable": true,
      "content": "package com.coditto.demo;\n…"
    }
  ],
  "candidate": {
    "allowedPaths": ["src/main/java/com/coditto/demo/RoleService.java"],
    "maxFiles": 1,
    "maxBytes": 16384
  }
}
```

`statement`는 `statement.md` 원문 Markdown이고 렌더링은 Frontend 책임입니다. 프로토타입의 사용자 영향·관찰된 증상·오류 로그·재현 절차·변경 제약은 `statement.md`의 문서 구조로 표현하며, 이를 별도 JSON 필드로 쪼개지 않습니다. 문제마다 서술 구조가 달라질 여지를 남기고, Markdown 하나만 정본으로 두기 위해서입니다.

`files`는 `manifest.display.files` 순서를 그대로 따릅니다. `editable`은 해당 경로가 `candidate.allowedPaths`에 있는지로 결정됩니다. 편집 불가 파일은 읽기 전용 컨텍스트입니다.

`candidate`를 그대로 내려보내 Frontend가 제출 전에 파일 수와 크기를 확인할 수 있게 합니다. 이 값은 조언이며 실제 강제는 API와 Runner가 각각 다시 수행합니다.

크기 상한은 파일당 64 KiB, 응답 전체 256 KiB로 둡니다. 초과하는 문제는 게시하지 않습니다.

오류: 존재하지 않는 `problemId`는 `404`, slug 형식 위반은 `400`입니다.

```json
{ "error": { "kind": "PROBLEM_NOT_FOUND" } }
```

`error.kind`는 `PROBLEM_NOT_FOUND` · `INVALID_PROBLEM_ID` · `CONTENT_ERROR`입니다. 마지막 값은 문제 패키지 자체가 선언 계약을 위반해 인덱스에 넣지 못한 경우이며 `500`으로 반환합니다. Judge 결과의 `error.kind`와 이름 공간은 분리돼 있고, 여기서는 `runStatus`를 함께 보내지 않는다는 점으로 구분됩니다.

### POST /api/submissions

기존 엔드포인트를 확장합니다. 동기 호출 하나로 전체 Judge를 실행하고 결과를 반환하는 지금 구조를 유지합니다.

요청:

```json
{
  "problemId": "role-update-001",
  "version": 1,
  "source": "package com.coditto.demo;\n…"
}
```

- `problemId`는 필수입니다. 지금은 하드코딩된 값을 쓰고 있지만, 유일한 클라이언트인 Frontend가 같은 변경에서 함께 바뀌므로 생략 시 기본값으로 되돌리는 하위호환 경로를 만들지 않습니다. 누락·형식 위반은 사용자 코드를 실행하지 않고 `REJECTED`/`INVALID_SUBMISSION`입니다.
- `version`은 선택이며 생략하면 API가 해당 문제의 최신 버전으로 채웁니다. Runner CLI는 version이 필수이므로 API가 항상 확정값을 넘깁니다.
- `source`는 기존 필드 이름과 의미를 그대로 유지합니다. `candidate.allowedPaths[0]`에 기록될 단일 파일의 내용이며 16 KiB 상한도 그대로입니다. raw JSON body 상한 128 KiB도 그대로입니다.

`source` 하나만 받는다는 것은 **1단계에 게시하는 문제의 `allowedPaths`가 정확히 하나여야 한다**는 제약입니다. 이 제약을 API가 강제합니다. `allowedPaths`가 둘 이상인 문제는 1단계에서 게시하지 않습니다. 다중 파일이 필요해지면 `files: [{ "path": …, "content": … }]`를 선택 필드로 추가하고 `source`를 `allowedPaths[0]`에 대한 축약형으로 정의합니다. 이 확장은 1단계 범위가 아닙니다.

응답은 `judge.md`의 정규화된 계약 JSON 그대로입니다. HTTP status 매핑도 현재 구현과 같습니다.

| `runStatus` | HTTP |
| --- | --- |
| `COMPLETED` | `200` |
| `REJECTED` | `400` |
| `SYSTEM_FAILED` | `502` |

#### 목표/회귀 실패 구분

`check`에 선택적 `suites`를 추가합니다. 이 프로젝트의 핵심 주장인 "기능 실패와 회귀 실패를 구분한다"를 결과로 드러내는 필드입니다.

```json
{
  "schemaVersion": "draft-v0",
  "problem": { "id": "role-update-001", "version": 1 },
  "runStatus": "COMPLETED",
  "check": {
    "id": "official",
    "execution": "TESTS_FAILED",
    "suites": {
      "target": "TESTS_PASSED",
      "regression": "TESTS_FAILED"
    }
  }
}
```

규칙은 다음과 같습니다.

- `suites`의 값은 `TESTS_PASSED`와 `TESTS_FAILED` 둘뿐입니다.
- `suites`는 `runStatus`가 `COMPLETED`이고 `execution`이 `TESTS_PASSED` 또는 `TESTS_FAILED`일 때만 존재합니다. `COMPILE_FAILED`·`TIMED_OUT`·`RESOURCE_LIMITED`에서는 두 suite 중 어느 것도 판정되지 않았으므로 `suites`를 생략합니다. 실행되지 않은 것을 `PASS`나 `FAIL`로 말하지 않습니다.
- 집계는 단방향입니다. 둘 다 `TESTS_PASSED`면 `execution`은 `TESTS_PASSED`, 하나라도 `TESTS_FAILED`면 `execution`은 `TESTS_FAILED`입니다. 기존 `execution` 값의 의미가 바뀌지 않으므로 이 필드를 읽지 않는 클라이언트는 영향받지 않습니다.
- 실패한 JUnit 메서드 이름은 응답에 포함하지 않습니다. 숨은 입력과 assertion을 드러내지 않으며, 메서드 이름 자체가 학습 정보를 거의 주지 않는다는 판단입니다.

Runner는 단일 `gradle test` 실행의 JUnit XML을 사후 분리해 이 필드를 출력합니다. API 혼자서는 이 값을 만들거나 추론하지 않고 Runner 결과를 검증해 그대로 전달합니다. Backend의 `isNormalizedContract`는 `check.suites`를 허용하고 `target`과 `regression`이 각각 `TESTS_PASSED` 또는 `TESTS_FAILED`인지 검증합니다. suites 존재 조건과 `execution` 집계 일관성은 Runner가 보장하며 Backend가 다시 계산하거나 검증하지 않습니다. 실제 Docker Runner와 Backend를 연결한 관통 검증에서 `buggy`/`fixed`/`compile-error`/`regression-error` 네 candidate 모두 기대한 응답을 반환함을 확인했습니다.

Runner는 JUnit XML(`build/test-results/test/*.xml`)의 테스트 클래스를 두 소스 디렉터리 소속으로 매핑하며 Gradle test 실행 횟수를 늘리지 않습니다. 매핑·오류 분류와 `suites`의 최종 형태는 `judge.md`가 소유하고, 이 문서는 API가 소비할 형태만 정의합니다.

### POST /api/interview-questions

판정 직후 면접 질문 카드를 실시간 생성합니다. **제출 응답과 분리된 별도 호출입니다.**

분리하는 이유는 `AGENTS.md`의 불변식입니다. LLM output은 판정 근거가 아니며 deterministic execution만 Judge verdict를 결정합니다. 생성을 제출 응답 경로에 넣으면 LLM 지연·오류·rate limit이 판정 응답을 지연시키거나 실패시킬 수 있습니다. 분리하면 Judge 판정은 이 기능이 완전히 죽어 있어도 정확히 지금과 같은 경로로 반환됩니다. Judge 판정 파이프라인은 변경하지 않습니다.

Frontend는 방금 받은 Judge 결과가 `runStatus: "COMPLETED"`이고 `check.execution: "TESTS_PASSED"`일 때만 이 endpoint를 별도로 호출한다. `TESTS_FAILED`, `COMPILE_FAILED`, `TIMED_OUT`, `RESOURCE_LIMITED` 및 `REJECTED`·`SYSTEM_FAILED`에는 호출하지 않고 Judge 결과만 표시한다. 이 호출 조건은 현재 Frontend의 UX 제한일 뿐 API가 제출 이력이나 Judge 결과를 조회·검증하는 것은 아니다. DB와 `submissionId`가 생기는 후속 phase에서만 서버가 통과 여부를 검증하도록 강화한다.

요청:

```json
{
  "problemId": "role-update-001",
  "version": 1,
  "source": "package com.coditto.demo;\n…"
}
```

이 endpoint는 Runner를 호출하거나 이전 제출 결과를 조회하지 않으며, 요청자가 통과한 제출을 보냈는지 검증하지 않는다.

#### 요청 검증과 HTTP 오류

아래 검증은 LLM 호출 전에 완료한다. 하나라도 실패하면 provider를 호출하지 않고 HTTP 오류로 끝난다. 이는 유효한 요청 뒤의 생성 실패와 다르며, `UNAVAILABLE`을 반환하지 않는다.

| 항목 | 계약 | 실패 응답 |
| --- | --- | --- |
| JSON 객체 | body는 JSON object여야 하며 `problemId`, 선택 `version`, `source` 외의 키를 포함하지 않는다. malformed JSON, 배열·scalar body, 필수 필드의 누락 또는 `null` 값은 유효하지 않다. | `400` + `{"error":{"kind":"INVALID_INTERVIEW_QUESTION_REQUEST"}}` |
| `problemId` | 필수 non-empty lowercase slug이며 `[a-z0-9]+(?:-[a-z0-9]+)*`를 만족한다. | `400` + `INVALID_INTERVIEW_QUESTION_REQUEST` |
| `version` | 선택 positive integer다. 생략하면 API가 해당 문제의 최신 게시 version으로 확정한다. `null`, 0, 음수, 소수, 문자열은 유효하지 않다. | `400` + `INVALID_INTERVIEW_QUESTION_REQUEST` |
| 문제 식별 | 확정된 `(problemId, version)`은 게시되어 있고 API의 manifest 인덱스에서 유효해야 한다. | `404` + `{"error":{"kind":"PROBLEM_NOT_FOUND"}}`; 패키지를 읽는 중 선언 계약 위반을 발견하면 `500` + `{"error":{"kind":"CONTENT_ERROR"}}` |
| `source` | 필수 문자열이며 UTF-8 byte length가 16 KiB 이하이다. 빈 문자열은 문법상 허용하되, 질문 품질을 보장하지 않으므로 유효한 요청 뒤 `UNAVAILABLE`이 될 수 있다. | `400` + `INVALID_INTERVIEW_QUESTION_REQUEST` |

raw JSON body는 `/api/submissions`와 똑같이 최대 128 KiB다. 구현 완료 시 `SubmissionBodyLimitFilter.shouldNotFilter`의 적용 대상은 `POST /api/submissions`와 `POST /api/interview-questions` 두 경로다. `Content-Length`가 상한을 넘거나 streaming body가 읽는 중 상한을 넘으면 filter가 역직렬화 전에 거부한다. 기존 filter 계약과 동일하게 이 경우의 HTTP status는 `400`이고 body는 아래 Judge rejection payload다. 이는 면접 질문 DTO 검증 응답도, `UNAVAILABLE`도 아니다.

```json
{
  "schemaVersion": "draft-v0",
  "problem": { "id": "role-update-001", "version": 1 },
  "runStatus": "REJECTED",
  "error": { "kind": "INVALID_SUBMISSION" }
}
```

이 payload는 현재 공통 filter가 `JudgeResponseFactory.rejectedSubmission()`을 사용해 만드는 기존 transport-limit 계약이다. 면접 질문 controller/service는 이를 다시 감싸거나 provider 오류로 바꾸지 않는다. 다른 요청 검증 오류는 위 표의 면접 질문 오류 body를 사용한다.

`SubmissionExceptionHandler`는 `/api/submissions`에 한정하고, 면접 질문 endpoint의 unreadable body는 전용 handler가 표에 정의한 `400` + `INVALID_INTERVIEW_QUESTION_REQUEST`로 반환한다. raw body 128 KiB 초과는 handler에 도달하기 전 공통 filter가 처리하므로 기존 Judge-shaped `REJECTED` payload를 그대로 유지하며 이 두 경로를 혼동하지 않는다.

#### 프롬프트 입력 경계

Backend는 problem index에 로드한 manifest의 `candidate.allowedPaths[0]`로 공개 base 파일을 찾고, 그 content와 검증된 요청 `source`를 비교해 diff를 계산한다. diff는 unified diff이며 header는 정확히 `--- a/{allowedPath}`와 `+++ b/{allowedPath}`를 쓰고, 각 hunk는 변경 전후 문맥을 각각 3줄씩 포함한다. 이 계산에만 base content와 전체 source를 사용한다.

프롬프트 구성 함수의 유일한 매개변수는 게시된 해당 version의 공개 `statement.md` 원문과 계산된 diff다. 함수에는 전체 `source`, base content, problem package directory, `judge-only/` directory, Runner stdout/stderr, Judge 결과 JSON·진단, API 오류 객체, reference 또는 테스트 파일 목록을 넘기지 않는다. 따라서 함수는 다음 자산을 직접 또는 간접으로 읽을 수 없다.

- `judge-only/target-tests/**`
- `judge-only/regression-tests/**`
- `judge-only/reference.patch`

provider 선택과 실제 프롬프트 문구는 이 계약의 범위 밖이다. 다만 어떤 provider 구현도 `statement.md`와 계산된 diff 밖의 파일 또는 오류 내용을 provider request에 추가해서는 안 된다.

응답 `200`:

```json
{
  "status": "GENERATED",
  "questions": [
    {
      "question": "역할 필드가 생략된 경우와 빈 목록으로 전달된 경우를 왜 다르게 처리해야 합니까?",
      "rationale": "제출 코드가 두 경우를 구분하지 않고 같은 분기로 처리합니다."
    },
    {
      "question": "기존 관리자 권한을 보존하려면 상태를 갱신하기 전에 무엇을 확인해야 합니까?",
      "rationale": "diff가 기존 컬렉션을 새 요청 값으로 바로 대체하는 변경을 보여 줍니다."
    },
    {
      "question": "이 변경이 null 입력에도 안전한 이유를 코드 흐름으로 설명해 보세요.",
      "rationale": "diff에 추가된 조건 분기가 null 경로를 명시적으로 처리합니다."
    }
  ]
}
```

`GENERATED`는 provider 응답을 파싱한 결과가 아래 계약을 모두 만족할 때만 사용한다.

- `questions`는 정확히 3개의 배열이다.
- 각 원소는 `question`, `rationale`만 가진 object이고 두 값 모두 non-blank string이다.
- 세 질문 object는 중복되지 않으며, 특히 `question` 문자열은 서로 달라야 한다.

빈 배열, 1개 또는 2개, 4개 이상, 중복, 누락·추가 필드, object가 아닌 원소, non-string 또는 blank 값, JSON/structured-output 파싱 불가 결과는 생성 성공으로 간주하지 않는다. 이 provider output 형식 위반은 `INVALID_PROVIDER_OUTPUT`으로 정규화한다.

유효한 요청 뒤 생성할 수 없는 경우는 모두 HTTP `200`과 정확히 같은 고정 body로 정규화한다.

```json
{ "status": "UNAVAILABLE", "questions": [] }
```

| 유효한 요청 이후 실패 경로 | 외부 응답 | 허용되는 내부 기록 |
| --- | --- | --- |
| 계산된 diff가 비어 있음 | provider를 호출하지 않고 `200` + 고정 `UNAVAILABLE` body | `EMPTY_DIFF` 분류와 안전한 운영 메타데이터 |
| 호출이 8초 안에 끝나지 않음 | `200` + 고정 `UNAVAILABLE` body | `TIMEOUT` 분류와 시간·provider 식별자 같은 운영 메타데이터 |
| provider transport/auth/rate-limit/5xx 등 상위 호출 오류 | `200` + 고정 `UNAVAILABLE` body | 정규화된 `PROVIDER_ERROR` 분류와 안전한 운영 메타데이터 |
| provider 응답의 JSON/structured output 파싱 실패 또는 위 질문 배열 계약 불일치 | `200` + 고정 `UNAVAILABLE` body | `INVALID_PROVIDER_OUTPUT` 분류와 안전한 운영 메타데이터 |
| API key 또는 provider 설정이 없음 | `200` + 고정 `UNAVAILABLE` body | `NOT_CONFIGURED` 분류와 안전한 운영 메타데이터 |

계산된 diff가 비었을 때의 `UNAVAILABLE`은 정상 통과 UX에서는 예상하지 않는 직접 호출 방어 규칙이다. `status`는 `GENERATED` 또는 `UNAVAILABLE`이다. provider의 원본 오류 body·상태 코드·API key·authorization header와 기타 비밀은 HTTP 응답에 절대 넣지 않는다. 로그도 비밀이나 provider 원문 body를 기록하지 않으며, 위의 정규화 실패 분류와 요청 시간·trace identifier처럼 비밀이 아닌 운영 메타데이터만 기록할 수 있다. Frontend는 `UNAVAILABLE`이면 카드 영역만 접고 판정 결과 표시는 그대로 유지한다. 이 endpoint는 submission controller, Judge Runner, Judge response의 성공·실패 경로를 호출하거나 변경하지 않으므로, 생성 기능이 완전히 실패해도 판정 결과 화면을 깨뜨릴 수 없다.

질문은 정확히 3개, LLM 호출 타임아웃은 8초로 둡니다. 캐시하지 않습니다. 인증이 범위 밖이라 호출자를 식별할 수 없으므로 rate limit과 비용 상한은 TODO입니다.

## 판단: 작업공간의 "테스트 실행" 버튼

**1단계에서 만들지 않습니다.** 제출 버튼 하나가 공개 테스트와 숨은 테스트를 한 번에 실행합니다. 프로토타입의 "테스트 실행" 버튼은 1단계 화면에서 제거하며, 별도 엔드포인트를 추가하지 않습니다.

근거는 세 가지입니다.

첫째, 실행할 공개 테스트가 존재하지 않습니다. `problems/role-update-001/v1/base/`에는 테스트 소스가 하나도 없고, `build.gradle`의 test sourceSet은 `/judge-tests/`의 두 디렉터리로 완전히 덮어써져 있습니다. 즉 모든 테스트가 judge-only 자산입니다. 이 버튼을 만들려면 문제 패키지에 새 `public-tests/` 계층, manifest 필드, Runner의 두 번째 실행 모드, `build.gradle`의 sourceSet 분기를 모두 추가해야 합니다. 계약 하나가 아니라 문제 패키지 구조와 Runner 계약이 함께 바뀝니다.

둘째, 비용이 제출과 같습니다. 공개 테스트만 돌려도 같은 Docker 컨테이너를 같은 조건으로 띄워야 하므로 "가볍게 미리 돌려보기"라는 UX 기대를 만족시키지 못합니다.

셋째, 무제한 재도전이 확정 범위이므로 제출 자체가 이미 시험 실행입니다. 별도 버튼의 남은 가치는 "회귀 실패를 숨긴 채 빠른 피드백"인데, 이번에 `check.suites`가 들어오면서 제출 결과가 그 역할을 더 정확하게 대신합니다.

나중에 필요해질 경우의 최소 설계만 남겨 둡니다. `POST /api/submissions`에 `checks: ["public"]`을 선택 필드로 추가해 Runner에 실행할 check를 지정하고, 응답은 같은 계약에서 `check.id`가 `public`인 형태를 사용합니다. 새 엔드포인트를 만들지 않고 check 축으로 확장하는 편이 `judge.md`의 미래 A–E check 구조와 일치합니다. 이 설계는 초안이며 1단계 범위가 아닙니다.

## 미확정 설계 초안 — 여력 되면

아래는 전부 **미확정이며 이번 1단계에는 만들지 않습니다.** 화면 흐름과 위 계약이 모순되지 않는지 확인하기 위한 초안입니다.

### 사용자 테스트 제출과 VERIFIED

`POST /api/submissions`에 선택 필드 `testSource`를 추가합니다. 판정은 사용자 테스트를 Buggy Base, 사용자 패치, Reference Patch에 각각 적용하는 세 check로 확장되며, 이는 `judge.md`가 예고한 A–E 계약 revision에 해당합니다. `VERIFIED`는 `execution` enum이 아니라 세 check 결과에서 파생되는 상위 개념이므로 `execution`에 값을 추가하지 않습니다. Reference Patch를 실행 대상으로 쓰는 순간 private problem-pack 자산의 저장·배포 방식이 선행 과제가 됩니다.

### Bug Vaccine 결과 조회

검수된 mutant 1~2개에 사용자 테스트를 적용해 `KILLED`/`SURVIVED`를 반환합니다. 제출 응답에 mutant 배열을 얹는 형태가 유력하며, 별도 조회 엔드포인트는 결과를 서버에 보관해야 하므로 DB 판단을 뒤집습니다. 따라서 조회 엔드포인트가 아니라 제출 응답 확장으로 설계합니다.

### Patch Autopsy 데이터 조회

`GET /api/problems/{problemId}/reference-patch`로 Base·Reference diff를 반환합니다. **이 엔드포인트는 `judge-only/reference.patch`를 공개하므로 위 공개 경계의 예외입니다.** 사용자가 이미 통과한 뒤에만 접근을 허용해야 하는데, 로그인과 제출 이력이 모두 범위 밖이라 1단계 구조로는 그 조건을 서버가 확인할 수 없습니다. 이 게이팅 문제가 풀리기 전에는 구현하지 않습니다.

## 구현 시 해소한 충돌 지점

아래 하드코딩과 응답 검증 충돌은 구현에서 해소했습니다.

- `JudgeResponseFactory`의 고정 문제 상수를 제거하고 API가 확정한 요청 단위 identity로 오류를 생성합니다.
- `JudgeRunnerClient.isNormalizedContract`는 Runner 응답의 `problem.id/version`을 요청한 문제와 대조합니다.
- 임시 candidate 파일은 인덱스에 검증된 `candidate.allowedPaths[0]`에 기록합니다.
- `isNormalizedContract`는 `check.suites`의 허용 shape와 값을 검증합니다.
- `SubmissionBodyLimitFilter.shouldNotFilter`는 `/api/submissions`와 `/api/interview-questions`에 같은 128 KiB transport 상한을 적용합니다.
- unreadable submission과 interview-question body는 각각의 endpoint 계약에 맞는 exception handler가 처리합니다.

## TODO

- `check.suites`의 확정 형태와 Runner 구현 방식(`judge.md` revision)
- 면접 질문 생성의 rate limit과 비용 상한
- private problem-pack 자산의 저장·배포 방식(여력 되면 범위의 선행 과제)
- Patch Autopsy 접근 게이팅
