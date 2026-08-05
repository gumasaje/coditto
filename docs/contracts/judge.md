# Judge 입출력 명세: Runner와 격리

**상태:** Draft v0 — Phase A Runner 구현 예정 및 미검증

이 문서는 Runner의 하위 계약을 정의합니다. Runner에서 API와 UI로 이어지는 Issue #1 순서는 [기술 아키텍처](../ARCHITECTURE.md)가 소유합니다.

## 범위

Issue #1 Phase A는 로컬 또는 신뢰하는 입력으로 하나의 공개 Java 21/Gradle/JUnit demo fixture를 실행할 계획입니다. official test command의 결과를 반환하며 PostgreSQL, 인증, browser workspace, A–E 평가, Mutant는 구현하지 않습니다.

Runner process는 stdout에 기계가 읽는 JSON 하나만 기록하고 입력·Docker·Gradle 진단은 stderr에 기록해야 합니다. 구체적인 CLI input layout은 TODO입니다.

## 패키지와 공개 범위

계획하는 problem package 형태는 다음과 같습니다.

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

demo package는 공개됩니다. 이 저장소에서 `judge-only/`는 해당 파일을 사용자 실행 workspace에 복사하거나 API 결과로 반환하지 않는 runtime 경계입니다. GitHub secrecy를 의미하지 않습니다.

production-only test, reference, future mutant는 이 공개 저장소에 commit하지 않을 private problem-pack asset입니다. 저장·배포 방식은 TODO입니다.

## 입력 계약

Runner는 선언된 problem version과 candidate product change를 받아야 합니다. 실행 전에 다음 제약을 검증할 계획입니다.

- problem identifier와 version은 manifest 선언과 정확히 일치해야 합니다.
- absolute path, `..` traversal, symlink, protected-file change를 거부해야 합니다.
- manifest가 선언한 allowed path, file-count, byte limit를 적용해야 합니다.
- workspace Git history는 신뢰하지 않습니다.
- archive transport를 추가할 경우 invalid archive와 archive 내부 traversal을 별도로 거부해야 합니다.

problem request 또는 candidate가 입력 계약을 위반하면 사용자 코드를 실행하지 않고 `REJECTED`와 `INVALID_SUBMISSION`을 반환합니다. problem package 자체가 선언 계약을 위반하면 `SYSTEM_FAILED`와 `CONTENT_ERROR`를 반환합니다.

## 실행 경계

각 실행은 immutable base와 검증된 candidate로 깨끗한 temporary workspace를 만들어야 합니다. official test는 사용자 workspace와 결과에서 분리하고 Runner만 접근하는 runtime input으로 전달해야 합니다.

Runner는 non-root Docker container를 사용하고 network를 `--network none`으로 차단해야 합니다. Docker socket, host Gradle home, host credential directory, 넓은 host directory는 mount하지 않습니다. container root filesystem은 read-only로 두고 필요한 writable 영역만 제한적으로 제공해야 합니다.

Judge image는 정확한 Gradle distribution과 demo dependency를 실행 전에 포함해야 합니다. 실제 compile과 test는 offline Gradle로 실행하고 두 단계를 별도 exit path로 구분해야 합니다. 구체적인 image digest와 CPU, memory, PID, `nofile`, timeout, output 제한은 Phase A 측정 후 확정할 TODO입니다.

모든 terminal path에서 temporary directory와 named container를 cleanup해야 합니다.

## 결과 책임

`execution`은 Runner가 하나의 check에서 사용자 코드를 실행하며 관찰한 결과를 나타냅니다. Issue #1에는 `official` check 하나가 있습니다.

- `TESTS_PASSED`
- `TESTS_FAILED`
- `COMPILE_FAILED`
- `TIMED_OUT`
- `RESOURCE_LIMITED`

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

`schemaVersion`은 draft marker이며 안정된 version을 약속하지 않습니다.

```json
{
  "schemaVersion": "draft-v0",
  "problem": { "id": "role-update-001", "version": 1 },
  "runStatus": "COMPLETED",
  "check": {
    "id": "official",
    "execution": "TESTS_PASSED"
  }
}
```

거부 응답은 `runStatus: "REJECTED"`와 `error.kind: "INVALID_SUBMISSION"`을 포함합니다. 시스템 실패는 `runStatus: "SYSTEM_FAILED"`와 `error.kind: "CONTENT_ERROR"` 또는 `"INFRA_ERROR"`를 포함합니다. A–E, learning-level, mutant, skip, aggregate field는 Issue #1 response에 포함하지 않습니다.

## 미래 A–E 계약

Issue #1 이후 별도 contract revision에서 candidate test와 독립적인 A–E check를 추가할 수 있습니다. 대상은 official 동작, base 재현, candidate 호환성, reference 호환성, 검토된 mutant 평가입니다. 이전 check가 이후 check를 막는 경우 `NOT_RUN`과 하나의 `notRunReason` 값 `PREREQUISITE_UNSATISFIED`를 추가할 수 있습니다.

향후 revision도 위 결과 책임을 보존해야 합니다. 사용자 코드 실행은 check-level `execution`으로 남고 top-level `error`는 `REJECTED`와 `SYSTEM_FAILED`에만 사용합니다.
