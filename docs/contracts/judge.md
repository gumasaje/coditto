# Judge 입출력 명세: Runner와 격리

**상태:** Draft v0 — Phase A `execution`과 `check.suites` 계약을 Runner에서 구현하고 Docker로 실검증함

이 문서는 Runner의 하위 계약을 정의합니다. Runner에서 API와 UI로 이어지는 Issue #1 순서는 [기술 아키텍처](../ARCHITECTURE.md)가 소유합니다.

## 범위

Issue #1 Phase A는 로컬 또는 신뢰하는 입력으로 하나의 공개 Java 21/Gradle/JUnit demo fixture를 실행합니다. official test command의 결과를 반환하며 PostgreSQL, 인증, browser workspace, A–E 평가, Mutant는 구현하지 않습니다.

현재 CLI 프로세스 경계는 다음과 같습니다.

```bash
python3 judge-runner/run.py \
  --problem-id role-update-001 \
  --version 1 \
  --candidate judge-runner/testdata/fixed
```

Runner stdout에는 기계가 읽는 JSON 하나만 기록하고 입력·Docker·Gradle 진단은 stderr에 기록합니다.

## 패키지와 공개 범위

```text
problems/{problem-id}/v1/
├── manifest.yaml
├── statement.md
├── base/
└── judge-only/
    ├── target-tests/
    ├── regression-tests/
    └── reference.patch
```

데모 패키지는 공개됩니다. 이 저장소에서 `judge-only/`는 해당 파일을 사용자 실행 workspace에 복사하거나 API 결과로 반환하지 않는 runtime 경계입니다. GitHub secrecy를 의미하지 않습니다.

production-only test, reference, future mutant는 이 공개 저장소에 commit하지 않을 private problem-pack asset입니다. 저장·배포 방식은 TODO입니다.

## 입력 계약

Runner는 선언된 problem version과 candidate product change를 받습니다. Phase A CLI는 archive가 아닌 candidate directory를 입력으로 받으며 다음을 실행 전에 검증합니다.

- `problem-id`는 `[a-z0-9]+(?:-[a-z0-9]+)*` 형식의 lowercase slug여야 합니다.
- `version`은 양수여야 합니다.
- absolute problem path와 `..` traversal을 거부하고, symlink를 해석한 최종 problem path가 repository의 `problems/` 밖이면 거부합니다.
- `manifest.yaml`의 `problem.id`와 `problem.version`은 요청값과 정확히 같아야 합니다. 불일치는 `SYSTEM_FAILED`와 `CONTENT_ERROR`입니다.
- `role-update-001` candidate에는 `src/main/java/com/coditto/demo/RoleService.java` 일반 파일 하나만 허용합니다.
- candidate는 최소 1개, 최대 1개 file과 최대 16 KiB를 허용합니다. candidate 내부 변경 경로의 absolute path, traversal, symlink, directory symlink, protected-file change를 거부합니다.
- workspace Git history는 신뢰하지 않습니다. archive transport와 archive validation은 현재 구현 범위가 아닙니다.

problem request 또는 candidate가 이 입력 계약을 위반하면 사용자 코드를 실행하지 않고 `REJECTED`와 `INVALID_SUBMISSION`을 반환합니다. problem package 자체가 선언 계약을 위반하면 `SYSTEM_FAILED`와 `CONTENT_ERROR`를 반환합니다.

## 실행 경계

각 실행은 immutable base와 검증된 candidate로 깨끗한 temporary workspace를 만듭니다. official test는 별도 temporary directory에 준비하고 candidate workspace와 각각 read-only mount로 전달합니다. container 안에서는 `/workspace` tmpfs에 candidate project를 복사하며 official test는 `/judge-tests` read-only mount에서 참조합니다.

Judge image는 Gradle 8.10.2 distribution과 demo의 JUnit runtime dependency를 build 단계에서 준비합니다. 실행 시 image의 cache seed를 writable tmpfs로 복사하고 `gradle --offline --no-daemon test`를 한 번 실행합니다. test task가 compile에 의존하므로 통과·실패 경로는 Gradle을 한 번만 기동하며, build가 실패하면서 JUnit XML이 하나도 생성되지 않은 경우에만 compile 전용 실행을 덧붙입니다. host Gradle home, host credential directory, Docker socket은 mount하지 않습니다.

Phase A에서 실제 적용하고 검증한 제한은 다음과 같습니다.

| 항목 | 적용값 |
| --- | --- |
| 네트워크 | `--network none` |
| 실행 사용자 | non-root `1000:1000` |
| 루트 filesystem | `--read-only` |
| capability | `--cap-drop ALL`, `no-new-privileges` |
| CPU | 1 |
| 메모리 / `memory-swap` | 768 MiB / 768 MiB(총 상한, 추가 swap 없음) |
| PID | 128 |
| 열린 파일 수 | `nofile=1024:1024` |
| 제한 시간 | 60초 |
| 캡처 출력 | 1 MiB |
| 쓰기 가능 tmpfs | `/tmp` 64 MiB, `/workspace` 512 MiB |

Runner는 timeout과 output limit를 host process에서도 감시합니다. 모든 terminal path에서 temporary directory를 정리하고 named container에 `--rm`과 final cleanup을 적용합니다.

## 결과 책임

`execution`은 Runner가 하나의 check에서 사용자 코드를 실행하며 관찰한 결과를 나타냅니다. Issue #1에는 `official` check 하나가 있습니다.

- `TESTS_PASSED`
- `TESTS_FAILED`
- `COMPILE_FAILED`
- `TIMED_OUT`
- `RESOURCE_LIMITED`

### 목표/회귀 suite 결과

Issue #1의 `official` check는 test 단계가 끝까지 판정된 경우 목표 동작과 기존 동작의 회귀 여부를 구분합니다. `check.suites`는 다음 두 key만 정확히 한 번씩 갖는 object입니다.

| key | 의미 | 값 domain |
| --- | --- | --- |
| `target` | 문제에서 고치도록 요구한 목표 동작 | `TESTS_PASSED` 또는 `TESTS_FAILED` |
| `regression` | 수정 전부터 보존해야 하는 기존 동작 | `TESTS_PASSED` 또는 `TESTS_FAILED` |

`suites`의 존재 조건은 선택 사항이 아니라 다음과 같은 양방향 계약입니다.

- `runStatus`가 `COMPLETED`이고 `check.execution`이 `TESTS_PASSED` 또는 `TESTS_FAILED`이면 `check.suites`가 **반드시 존재**하며 `target`과 `regression`을 모두 포함해야 합니다.
- `check.execution`이 `COMPILE_FAILED`, `TIMED_OUT`, `RESOURCE_LIMITED`이면 `check.suites`가 **반드시 없어야** 합니다. test 단계 전체를 판정하지 못한 상태에서 일부 결과를 반환하지 않습니다.
- `runStatus`가 `REJECTED` 또는 `SYSTEM_FAILED`이면 `check` 자체가 없으므로 `check.suites`도 반드시 없습니다.

Runner는 두 suite를 먼저 판정한 뒤 다음 표대로 `execution`을 한 방향으로 집계합니다.

| `suites.target` | `suites.regression` | `check.execution` |
| --- | --- | --- |
| `TESTS_PASSED` | `TESTS_PASSED` | `TESTS_PASSED` |
| `TESTS_PASSED` | `TESTS_FAILED` | `TESTS_FAILED` |
| `TESTS_FAILED` | `TESTS_PASSED` | `TESTS_FAILED` |
| `TESTS_FAILED` | `TESTS_FAILED` | `TESTS_FAILED` |

`execution`만 보고 두 suite 값을 추측하는 역방향 집계는 허용하지 않습니다. 예를 들어 test process가 실패했다는 사실만으로 두 suite를 모두 `TESTS_FAILED`로 만들 수 없습니다.

### 단일 Gradle 실행에서 suite를 판별하는 방법

두 official suite는 `base/build.gradle`에서 하나의 Gradle `test` source set으로 합쳐지고 `gradle test`는 한 번만 실행됩니다. Runner는 실행 횟수를 늘리지 않습니다. 사용자 코드를 실행하기 전에는 problem package를 preflight하고, test command가 종료된 뒤에는 container 안의 trusted parser가 `/workspace/project/build/test-results/test/*.xml`을 container workspace 정리 전에 읽어 suite를 판정합니다.

#### 실행 전 problem-package preflight

Runner는 candidate container를 시작하기 전에 다음 순서로 source map을 만듭니다.

1. `judge-only/target-tests/src/test/java/`와 `judge-only/regression-tests/src/test/java/` 아래의 일반 `.java` file을 각각 재귀적으로 열거합니다.
2. 각 source root 기준 relative path에서 `.java` suffix를 제거하고 `/`를 `.`으로 바꿔 source FQN을 만듭니다. `com/example/RoleTest.java`의 source FQN은 `com.example.RoleTest`입니다.
3. target과 regression에 test source가 각각 한 개 이상 있는지 확인합니다.
4. 같은 source FQN 또는 같은 source-relative path가 두 tree에 동시에 존재하지 않는지 확인합니다.

한 tree라도 test source가 0개이거나 두 tree 사이에 FQN/path가 중복되면 problem package가 suite 소속을 유일하게 선언하지 못한 것이므로 사용자 코드를 실행하지 않고 `SYSTEM_FAILED` / `CONTENT_ERROR`를 반환합니다. 이 preflight를 통과한 source map만 이후 XML 매핑의 기준으로 사용합니다.

#### JUnit XML 매핑과 suite 판정

1. trusted parser는 모든 XML이 존재하고 읽을 수 있으며 well-formed인지 먼저 검증합니다. candidate code 실행 뒤의 산출물은 신뢰하지 않으므로 DTD와 external entity는 허용하지 않습니다. XML file set이 비었거나 file을 읽을 수 없거나 XML이 well-formed가 아니거나 `<testcase>`에 필수 `classname` attribute가 없으면 `SYSTEM_FAILED` / `INFRA_ERROR`로 종료합니다.
2. 각 `<testcase classname>`에서 중첩 class 표기인 `$`와 그 뒤 문자열을 제거해 최상위 test class FQN을 구합니다. 예를 들어 `com.example.RoleTest$Nested`는 `com.example.RoleTest`로 정규화합니다.
3. 정규화한 FQN을 preflight source map에서 찾습니다. target 또는 regression 중 정확히 한 곳에서 찾은 경우에만 해당 testcase를 그 suite에 배정합니다. source map에 없는 FQN이면 official test의 package·source path와 실행 class가 맞지 않는 problem package fault이므로 `SYSTEM_FAILED` / `CONTENT_ERROR`로 종료합니다.
4. `<failure>`, `<error>`, `<skipped>` child 중 하나라도 있는 testcase는 소속 suite를 `TESTS_FAILED`로 만듭니다. `<skipped>` testcase는 관찰 건수에 포함하고 해당 suite를 `TESTS_FAILED`로 판정하며, `SYSTEM_FAILED` / `CONTENT_ERROR`로 재분류하지 않습니다.
5. XML 전체를 매핑한 뒤 target 또는 regression에 관찰된 testcase가 0개이면 preflight를 통과한 test source가 실행 산출물에 나타나지 않은 것이므로 `SYSTEM_FAILED` / `INFRA_ERROR`로 종료합니다.
6. 각 suite에 관찰 testcase가 한 개 이상 있고, 그 suite의 모든 testcase에 failure, error, skipped가 없을 때만 그 suite를 `TESTS_PASSED`로 판정합니다. 두 suite 값을 모두 확정한 뒤에만 위 집계 표로 `check.execution`을 만듭니다.

오류 분류는 위 단계 순서를 따르며 첫 번째 실패가 terminal 결과입니다. 따라서 preflight의 source 부재·중복과 XML classname의 source-map 불일치는 `CONTENT_ERROR`, preflight 통과 뒤의 XML 부재·구문/필수 attribute 오류·suite별 관찰 testcase 0건은 `INFRA_ERROR`입니다. 같은 입력 상태를 두 error kind로 재분류하지 않습니다. XML 검증은 test command가 종료된 경로에서만 요구하며 compile failure, timeout, resource limit에서는 없거나 일부만 생성된 XML을 suite 결과로 사용하지 않습니다.

#### Container에서 host Runner로 전달하는 예약 exit code

trusted parser는 Judge image의 immutable entrypoint에 포함되며 candidate workspace에서 교체할 수 없습니다. parser는 Gradle test가 끝난 뒤 XML을 집계하고, 새 writable mount나 stdout marker를 사용하지 않고 container process의 예약 exit code 하나로 host Runner에 결과를 전달합니다. host Runner는 container의 stdout 또는 stderr 내용으로 verdict를 추론하지 않고 다음 표만 해석합니다.

| Container exit code | Host 정규화 결과 |
| --- | --- |
| `0` | `COMPLETED`; target `TESTS_PASSED`, regression `TESTS_PASSED`, execution `TESTS_PASSED` |
| `20` | `COMPLETED`; execution `COMPILE_FAILED`; `suites` 없음 |
| `21` | `COMPLETED`; target `TESTS_FAILED`, regression `TESTS_PASSED`, execution `TESTS_FAILED` |
| `22` | `COMPLETED`; target `TESTS_PASSED`, regression `TESTS_FAILED`, execution `TESTS_FAILED` |
| `23` | `COMPLETED`; target `TESTS_FAILED`, regression `TESTS_FAILED`, execution `TESTS_FAILED` |
| `24` | `SYSTEM_FAILED` / `CONTENT_ERROR`; `check` 없음 |
| `25` | `SYSTEM_FAILED` / `INFRA_ERROR`; `check` 없음 |
| `26` | `COMPLETED`; execution `RESOURCE_LIMITED`; `suites` 없음 |
| `137` | `COMPLETED`; execution `RESOURCE_LIMITED`; `suites` 없음 |

실행 전 preflight의 `CONTENT_ERROR`는 container를 시작하지 않고 같은 top-level 결과를 반환하며, exit code `24`는 test 이후 XML classname과 prevalidated source map의 불일치 또는 parser가 재검출한 source-map 중복을 전달합니다. exit code `25`는 XML 산출물 또는 parser 일관성 오류, `26`은 container 내부에서 기존 1 MiB output limit을 감시하다 초과한 경우에 사용합니다. host가 직접 감지한 timeout은 `TIMED_OUT`, host output limit 초과는 `RESOURCE_LIMITED`로 정규화하므로 별도 container exit code가 필요하지 않습니다. 그 밖의 예약되지 않은 exit code는 `SYSTEM_FAILED` / `INFRA_ERROR`입니다.

trusted parser는 원래 Gradle test exit status도 별도로 보존해 XML과 대조합니다. Gradle status `0`인데 XML에 `<failure>` 또는 `<error>`가 있거나, Gradle status가 non-zero인데 XML에 failure와 error가 하나도 없으면 관찰값 모순이므로 exit code `25`를 사용합니다. `<skipped>`는 Gradle이 status `0`으로 처리할 수 있지만 이 계약이 더 엄격하게 suite 실패로 정규화하므로, skipped만으로 생긴 suite 실패는 모순이 아닙니다.

공개 stdout JSON, host stderr, 지속 로그에는 suite별 통과·실패와 정규화된 stage/error category만 기록합니다. raw Gradle output은 container 안의 bounded sink에서 기존 output limit을 적용하는 데만 사용하고 host로 그대로 전달하지 않습니다. JUnit XML 원문, test class·method 이름, assertion message, stack trace, hidden input은 response와 diagnostics/log 어디에도 기록하지 않습니다. Runner는 host에서 container output의 byte 수만 진단하고 내용을 다시 출력하지 않으며, immutable Python entrypoint는 Python 표준 라이브러리 parser에서 DTD와 entity를 거부합니다.

`runStatus`는 Judge 서비스가 자신의 책임을 완료했는지를 나타냅니다.

- `COMPLETED`: test 통과·실패, compilation failure, timeout, resource limit을 포함해 Judge가 정상적인 판정을 완료했습니다.
- `REJECTED`: 사용자 코드 실행 전에 input이 거부됐습니다.
- `SYSTEM_FAILED`: content 또는 infrastructure fault 때문에 유효한 판정을 만들지 못했습니다.

선택적인 top-level `error`는 `REJECTED`와 `SYSTEM_FAILED`에만 존재합니다.

| `runStatus` | `error.kind` | 의미 |
| --- | --- | --- |
| `REJECTED` | `INVALID_SUBMISSION` | input이 package 또는 transport rule을 위반함 |
| `SYSTEM_FAILED` | `CONTENT_ERROR` | demo 또는 private-pack asset이 선언 계약을 위반함 |
| `SYSTEM_FAILED` | `INFRA_ERROR` | Docker, host, storage 또는 Runner fault |

`COMPLETED`에는 `error`를 넣지 않습니다. `COMPILE_FAILED`, `TIMED_OUT`, `RESOURCE_LIMITED`는 top-level error가 아니라 execution outcome입니다. 이 구조는 execution enum과 error kind의 이름과 책임을 분리합니다.

## Issue #1 최소 JSON

`schemaVersion`은 draft marker이며 안정된 version을 약속하지 않습니다. 이 revision도 `draft-v0`을 사용합니다.

test 단계가 정상적으로 판정됐고 target은 통과했지만 regression이 실패한 응답입니다. 위 존재 조건에 따라 `suites`가 반드시 있습니다.

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

compile 단계에서 판정이 끝난 응답입니다. test suite를 판정하지 않았으므로 `suites`가 반드시 없습니다.

```json
{
  "schemaVersion": "draft-v0",
  "problem": { "id": "role-update-001", "version": 1 },
  "runStatus": "COMPLETED",
  "check": {
    "id": "official",
    "execution": "COMPILE_FAILED"
  }
}
```

거부 응답은 `runStatus: "REJECTED"`와 `error.kind: "INVALID_SUBMISSION"`을 포함합니다. 시스템 실패는 `runStatus: "SYSTEM_FAILED"`와 `error.kind: "CONTENT_ERROR"` 또는 `"INFRA_ERROR"`를 포함합니다. A–E, learning-level, mutant, skip, aggregate field는 Issue #1 response에 포함하지 않습니다.

## Phase A 검증 증거

`judge-runner/verify_spike.py`는 Docker Desktop에서 image를 빌드하고 다음 네 candidate를 각각 3회 실행해 정규화된 JSON의 반복 일치와 cleanup을 검증했습니다.

- `buggy` → `TESTS_FAILED`
- `fixed` → `TESTS_PASSED`
- `compile-error` → `COMPILE_FAILED`
- `regression-error` → target 기능은 통과하지만 regression test가 실패해 `TESTS_FAILED`

검증은 실제 Docker command의 `--network none`, 두 개의 좁은 read-only mount, non-root image 설정, 실행 후 남은 Judge container가 없다는 사실도 확인합니다.

현재 검증은 네 candidate를 각각 3회 실행해 `buggy`는 target 실패/regression 통과, `fixed`는 두 suite 통과, `compile-error`는 suites 없는 `COMPILE_FAILED`, `regression-error`는 target 통과/regression 실패로 확인했습니다. 정규화 JSON의 반복 일치, test 상세 비노출, 격리 옵션과 container cleanup도 함께 검증했습니다.

## 알려진 한계

- JUnit XML 없이 build가 실패한 뒤 덧붙이는 compile 전용 실행의 non-zero exit는 `COMPILE_FAILED`로 정규화합니다. 따라서 Gradle daemon startup처럼 compile 단계에서 발생한 일부 infrastructure fault가 `COMPILE_FAILED`로 분류될 수 있습니다.
- Phase A는 공개 demo와 로컬 또는 신뢰하는 입력의 기술 검증입니다. Docker와 위 제한만으로 production-grade arbitrary untrusted code security를 주장하지 않습니다.
- Judge image digest pinning, private problem pack, stronger isolation과 production resource policy는 TODO입니다.

## 미래 A–E 계약

Issue #1 이후 별도 contract revision에서 candidate test와 독립적인 A–E check를 추가할 수 있습니다. 대상은 official 동작, base 재현, candidate 호환성, reference 호환성, 검토된 mutant 평가입니다. 이전 check가 이후 check를 막는 경우 `NOT_RUN`과 하나의 `notRunReason` 값 `PREREQUISITE_UNSATISFIED`를 추가할 수 있습니다.

향후 revision도 위 결과 책임을 보존해야 합니다. 사용자 코드 실행은 check-level `execution`으로 남고 top-level `error`는 `REJECTED`와 `SYSTEM_FAILED`에만 사용합니다.
