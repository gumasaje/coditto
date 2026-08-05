# Coditto 기술 아키텍처

**상태:** 계획·계약 문서, Phase A·B·C 구현 예정 및 미검증

## 첫 실행 가능한 핵심 흐름: Issue #1

Issue #1은 첫 구현 순서와 범위를 정하는 기준이며, 다음의 가장 작은 전체 실행 경로를 증명하는 작업입니다.

```text
최소 Frontend 제출 화면
→ 최소 Backend 제출 API
→ 공개 Java 21/Gradle/JUnit demo fixture
→ 격리된 Docker Runner
→ 결과 JSON
→ Frontend에 결과 표시
```

Issue #1을 완료하려면 아래 세 단계가 모두 필요합니다. 현재는 모든 단계가 구현 전입니다.

| 단계 | 범위 | 현재 상태 | 완료 증거 |
| --- | --- | --- | --- |
| A. Fixture와 Runner | `problems/`, `judge-runner/`; 로컬 또는 신뢰하는 데모 입력을 Docker에서 검증 | 구현 예정·미검증 | TODO: `TESTS_PASSED`, `TESTS_FAILED`, `COMPILE_FAILED` JSON과 모든 종료 경로의 cleanup 확인 |
| B. API 어댑터 | `backend/`; 최소 Spring Boot submission endpoint가 실제 Runner 호출 | 구현 예정·미검증 | TODO: API가 모의 값이 아닌 실제 정규화된 Judge 결과 반환 |
| C. 제출과 결과 UI | `frontend/`; 하나의 얇은 제출 동작과 결과 화면 | 구현 예정·미검증 | TODO: UI가 실제 API를 호출하고 세 execution outcome 표시 |

PostgreSQL, 인증, browser IDE, 최종 UI, queue, A–E/Mutant 평가, 생성 또는 개인화 문제는 Issue #1 범위 밖입니다.

## 모노레포 경계

| 경로 | 책임 |
| --- | --- |
| `frontend/` | Issue #1 제출/결과 화면, 이후 제품 UI |
| `backend/` | Issue #1 Runner 어댑터, 이후 session과 persistence |
| `judge-runner/` | 입력 검증, 격리 실행, 결과 정규화, cleanup |
| `problems/` | 공개 demo fixture와 problem-package 계약 |

각 디렉터리는 의미 있는 구현 또는 설정이 생길 때만 만듭니다. Backend는 향후 Runner 프로세스를 호출하거나 작업을 전달하지만 제출 코드를 API 프로세스 안에서 실행하지 않습니다.

## 공개 데모와 프로덕션 자산 경계

Issue #1 fixture는 공개되고 재현 가능해야 합니다. 이 저장소의 `judge-only/`는 해당 파일을 사용자 실행 workspace나 API 결과에 포함하지 않는 runtime 경계를 뜻하며 GitHub confidentiality를 뜻하지 않습니다.

실제 service-only test, reference patch, mutant는 공개 저장소에 두지 않을 production private problem-pack asset입니다. 저장·배포 방식은 TODO입니다.

## Runner 격리와 offline Gradle 원칙

Issue #1 Phase A는 로컬 또는 신뢰하는 데모 입력으로 기술 경로를 검증할 계획입니다. 임의의 신뢰하지 않는 코드를 공개 서비스에서 안전하게 받을 수 있다는 주장이 아닙니다.

- Judge image는 실행 전에 정확한 Gradle distribution과 demo dependency를 포함해야 합니다.
- Runner는 host Gradle home, credential directory, Docker socket을 mount하지 않아야 합니다.
- 실제 실행 container는 non-root이고 root filesystem은 read-only이며 network는 `--network none`이어야 합니다.
- candidate workspace 외의 넓은 host mount를 금지하고 `judge-only/` asset은 사용자 workspace와 결과에서 분리해야 합니다.
- compile 단계와 test 단계를 분리해 build output 문자열 추측 없이 `COMPILE_FAILED`와 `TESTS_FAILED`를 구분해야 합니다.
- CPU, memory, PID, `nofile`, timeout, output 제한은 Phase A에서 측정한 뒤 관찰된 값만 문서화합니다.
- 모든 종료 경로에서 temporary directory와 Judge container를 cleanup해야 합니다.

Docker만으로 production-grade arbitrary untrusted code security를 주장할 수 없습니다. 공개 임의 코드 실행 전에는 더 강한 격리와 검증된 resource policy가 필요합니다.

## 안정적인 책임 분리

- Frontend는 향후 정규화된 공개 결과만 표시합니다.
- Backend는 향후 request를 검증하고 Runner 프로세스 경계를 호출하며 build output을 verdict로 해석하지 않습니다.
- Runner는 [Judge 입출력 명세](contracts/judge.md)에 따라 입력 검증, container 실행, 결과 정규화, cleanup을 소유합니다.
- problem package는 runtime과 허용 입력을 선언합니다. runtime-only demo file과 production private-pack file은 사용자 workspace나 API 결과에 들어가지 않습니다.
- deterministic execution만 Judge verdict를 결정하며 LLM output은 판정 근거가 아닙니다.

## 남은 과제(TODO)

- 정확한 demo fixture, manifest shape, CLI input layout
- offline Gradle image 내용, image digest pinning, 측정된 resource limit
- Phase B의 최소 API DTO와 Runner process boundary
- production private problem pack의 저장·배포 방식
- 공개 임의 코드 실행 전에 필요한 더 강한 격리와 검증된 resource policy
