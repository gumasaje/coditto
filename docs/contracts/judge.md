# Judge 입출력 명세: Runner와 격리

**상태:** Draft v0 — 기존 Phase A `execution` 계약은 Runner에서 구현하고 Docker로 실검증함. 이 문서의 `check.suites` revision은 계약만 확정했으며 Runner 구현과 Docker 실검증 전임

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

Judge image는 Gradle 8.10.2 distribution과 demo의 JUnit runtime dependency를 build 단계에서 준비합니다. 실행 시 image의 cache seed를 writable tmpfs로 복사하고 compile과 test를 각각 `gradle --offline --no-daemon`으로 실행합니다. host Gradle home, host credential directory, Docker socket은 mount하지 않습니다.

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

두 official suite는 `base/build.gradle`에서 하나의 Gradle `test` source set으로 합쳐지고 `gradle test`는 한 번만 실행됩니다. Runner는 실행 횟수를 늘리지 않고, test command가 종료된 뒤 container의 `/workspace/project/build/test-results/test/*.xml`에 생성된 Gradle JUnit XML을 container workspace 정리 전에 읽어 suite를 판정합니다.

매핑과 판정 절차는 다음과 같습니다.

1. 모든 XML의 `<testcase>`에서 필수 `classname` attribute를 읽습니다. 같은 class의 여러 test method는 각각 testcase로 집계하되 public 결과에는 class 또는 method 이름을 넣지 않습니다. candidate code 실행 뒤의 산출물은 신뢰하지 않으므로 XML parser는 DTD와 external entity를 허용하지 않습니다.
2. 중첩 class 표기인 `$`와 그 뒤 문자열을 제거해 최상위 test class FQN을 구합니다. 예를 들어 `com.example.RoleTest$Nested`는 `com.example.RoleTest`로 정규화합니다.
3. FQN의 `.`을 `/`로 바꾸고 `.java`를 붙여 source-relative path를 만듭니다. 예를 들어 `com.example.RoleTest`는 `com/example/RoleTest.java`가 됩니다.
4. 이 path를 아래 두 위치와 각각 대조합니다.
   - `/judge-tests/target-tests/src/test/java/{source-relative path}`
   - `/judge-tests/regression-tests/src/test/java/{source-relative path}`
5. 정확히 한 위치에 일반 파일이 있을 때만 그 testcase를 해당 suite에 배정합니다. 어느 쪽에도 없거나 양쪽 모두에 있으면 매핑에 실패한 것입니다.
6. suite에 배정된 testcase 중 하나라도 `<failure>` 또는 `<error>` child를 가지면 그 suite는 `TESTS_FAILED`입니다. 배정된 testcase가 한 개 이상이고 모두 failure와 error 없이 끝났으면 `TESTS_PASSED`입니다.
7. 두 suite 값을 모두 확정한 뒤에만 위 집계 표로 `check.execution`을 만듭니다. container exit code `0`은 두 suite와 집계가 모두 `TESTS_PASSED`일 때, `21`은 하나 이상의 suite와 집계가 `TESTS_FAILED`일 때만 일치합니다. exit code는 이 일치 여부를 확인하는 용도이며 suite 값을 대신하지 않습니다.

신뢰할 수 있는 두 suite 값을 만들지 못한 경우에는 불완전한 `COMPLETED` 결과나 추측한 `suites`를 반환하지 않습니다. 이미 정의된 error 책임에 따라 다음처럼 분류하고, 최종 응답에는 `check`를 넣지 않습니다.

| 상황 | 최종 결과 | 책임 근거 |
| --- | --- | --- |
| testcase FQN이 두 source tree 어디에도 매핑되지 않음 | `SYSTEM_FAILED` / `CONTENT_ERROR` | official test source의 package·경로가 선언된 suite 구조와 맞지 않는 problem package fault |
| 같은 FQN source path가 target과 regression 양쪽에 있어 매핑이 중복됨 | `SYSTEM_FAILED` / `CONTENT_ERROR` | suite 소속을 유일하게 만들지 못한 problem package fault |
| target 또는 regression에 배정된 testcase가 0개임 | `SYSTEM_FAILED` / `CONTENT_ERROR` | 두 official suite 중 하나가 실행 가능한 test를 제공하지 못한 problem package fault |
| test command가 정상적으로 종료 상태를 반환했지만 XML file set이 비어 있음, 필요한 XML이 누락됨, XML이 well-formed가 아님, 또는 testcase에 `classname`이 없음 | `SYSTEM_FAILED` / `INFRA_ERROR` | Gradle 실행 산출물을 Runner가 읽고 정규화할 수 없는 execution/Runner fault |
| XML 집계와 test command exit code가 서로 모순됨 | `SYSTEM_FAILED` / `INFRA_ERROR` | 실행 관찰값이 일관되지 않아 유효한 verdict를 만들 수 없는 execution/Runner fault |

XML 누락과 parse 검증은 `execution`이 `TESTS_PASSED` 또는 `TESTS_FAILED`가 될 test command 종료 경로에서만 요구합니다. compile failure, timeout, resource limit에서는 없거나 일부만 생성된 XML을 suite 결과로 사용하지 않습니다.

공개 stdout JSON에는 suite별 통과·실패만 기록합니다. 실패한 JUnit class·method 이름, assertion message, stack trace, XML 원문은 응답에 포함하지 않습니다. diagnostics는 stderr에만 기록하며 Backend는 이를 API response로 전달하지 않습니다.

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

이 증거는 revision 전 Runner가 반환한 `check.execution`과 container diagnostics에 대한 것입니다. 현재 Runner는 JUnit XML을 읽거나 `check.suites`를 출력하지 않으므로, 위 `suites` 계약과 매핑·오류 분류는 아직 구현 또는 Docker 실검증됐다는 증거가 없습니다.

## 알려진 한계

- 현재 compile 단계의 non-zero exit는 `COMPILE_FAILED`로 정규화합니다. 따라서 Gradle daemon startup처럼 compile 단계에서 발생한 일부 infrastructure fault가 `COMPILE_FAILED`로 분류될 수 있습니다.
- 현재 Runner는 container exit code만으로 `execution`을 만들며 JUnit XML 기반 `suites` revision을 아직 구현하지 않았습니다.
- Phase A는 공개 demo와 로컬 또는 신뢰하는 입력의 기술 검증입니다. Docker와 위 제한만으로 production-grade arbitrary untrusted code security를 주장하지 않습니다.
- Judge image digest pinning, private problem pack, stronger isolation과 production resource policy는 TODO입니다.

## 미래 A–E 계약

Issue #1 이후 별도 contract revision에서 candidate test와 독립적인 A–E check를 추가할 수 있습니다. 대상은 official 동작, base 재현, candidate 호환성, reference 호환성, 검토된 mutant 평가입니다. 이전 check가 이후 check를 막는 경우 `NOT_RUN`과 하나의 `notRunReason` 값 `PREREQUISITE_UNSATISFIED`를 추가할 수 있습니다.

향후 revision도 위 결과 책임을 보존해야 합니다. 사용자 코드 실행은 check-level `execution`으로 남고 top-level `error`는 `REJECTED`와 `SYSTEM_FAILED`에만 사용합니다.
