# Coditto 기술 아키텍처

**상태:** Phase A fixture·Runner 구현 및 Docker 실검증 완료, Phase B 최소 API 어댑터 구현, Phase C 제출/결과 UI 및 로컬 관통 검증 완료

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

Issue #1을 완료하려면 아래 세 단계가 모두 필요합니다. 현재는 Phase A와 최소 Phase B가 구현됐습니다.

| 단계 | 범위 | 현재 상태 | 완료 증거 |
| --- | --- | --- | --- |
| A. Fixture와 Runner | `problems/`, `judge-runner/`; 로컬 또는 신뢰하는 데모 입력을 Docker에서 검증 | 완료 | 네 candidate를 각각 3회 실행해 `execution`과 target/regression suite 구분을 결정론적으로 확인하고 상세 비노출 및 매 실행 후 cleanup 검증 |
| B. API 어댑터 | `backend/`; 최소 Spring Boot submission endpoint가 실제 Runner 호출 | 구현 | endpoint 통합 테스트가 별도 Python subprocess의 정규화 결과를 반환하고, malformed stdout·timeout을 `SYSTEM_FAILED`/`INFRA_ERROR`로 처리함 |
| C. 제출과 결과 UI | `frontend/`; 하나의 얇은 제출 동작과 결과 화면 | 완료 | Vite proxy를 통한 실제 API 호출, `TESTS_PASSED`, `TESTS_FAILED`, `COMPILE_FAILED` 브라우저 표시 및 Frontend 테스트 |

PostgreSQL, 인증, browser IDE, 최종 UI, queue, A–E/Mutant 평가, 생성 또는 개인화 문제는 Issue #1 범위 밖입니다.

## 모노레포 경계

| 경로 | 책임 | 현재 상태 |
| --- | --- | --- |
| `frontend/` | Issue #1 제출/결과 화면, 이후 제품 UI | 미구현 |
| `backend/` | Issue #1 Runner 어댑터, 이후 session과 persistence | Phase B 최소 API 어댑터 구현 |
| `judge-runner/` | 입력 검증, 격리 실행, 결과 정규화, cleanup | Phase A 구현 완료 |
| `problems/` | 공개 demo fixture와 problem-package 계약 | Phase A 구현 완료 |

각 디렉터리는 의미 있는 구현 또는 설정이 생길 때만 만듭니다. Backend는 `POST /api/submissions`에서 최대 128 KiB raw JSON body의 `source` 하나를 받아 role-update-001 v1의 16 KiB decoded-source 계약을 먼저 검증한 뒤 허용 파일 경로에 임시로 기록하고, API가 생성한 container name과 함께 별도 `python3 judge-runner/run.py` subprocess를 호출합니다. raw transport 상한은 JSON escaping으로 인한 byte 확장을 수용하기 위해 source 계약보다 크며, source 자체의 16 KiB 상한을 완화하지 않습니다. API 프로세스는 제출 코드를 load 또는 실행하지 않으며 Runner diagnostics는 API response에 전달하지 않습니다. stdout가 정확히 한 줄의 계약 JSON이고 contract shape를 만족할 때만 이를 반환합니다. Runner 실행 실패·timeout·비계약 stdout은 `SYSTEM_FAILED`/`INFRA_ERROR`로 반환하며, terminal path마다 Python process tree와 해당 Judge container를 정리한 후 temporary candidate directory를 제거합니다. 배포 시 Runner script path는 절대 경로 configuration으로 지정해야 합니다.

## Phase A 구현 경계

공개 fixture는 `problems/role-update-001/v1/`에 있으며, `manifest.yaml`은 Java 21, Gradle 8.10.2, Judge 이미지, 수정 허용 경로, 파일 수와 byte 제한을 선언합니다. Runner CLI는 다음 프로세스 경계로 실행합니다.

```bash
python3 judge-runner/run.py --candidate judge-runner/testdata/fixed
```

Runner는 stdout에 기계가 읽는 JSON 하나만 출력하고 정규화된 Docker·stage 진단은 stderr로 분리합니다. compile 단계와 test 단계를 별도 Gradle 실행과 exit code로 구분하며, 단일 test 실행의 JUnit XML을 immutable parser가 target/regression suite로 사후 배정합니다. 결과 형태는 [Judge 입출력 명세](contracts/judge.md)를 따릅니다.

`judge-runner/verify_spike.py`는 Judge 이미지를 빌드한 뒤 네 candidate를 각각 3회 실행합니다. 기대한 `execution`과 `suites`, 정규화된 JSON의 반복 일치, test 상세 비노출, 실제 `--network none`과 mount 경계, non-root 이미지, 남은 container가 없는지를 함께 검사합니다.

## 공개 데모와 프로덕션 자산 경계

Issue #1 fixture는 공개되고 재현 가능합니다. 이 저장소의 `judge-only/`는 Runner가 해당 파일을 사용자 실행 workspace나 API 결과에 포함하지 않는 runtime 경계이며 GitHub confidentiality를 뜻하지 않습니다. Runner는 candidate workspace와 official test를 서로 다른 read-only mount로 전달합니다.

실제 service-only test, reference patch, mutant는 공개 저장소에 두지 않을 production private problem-pack asset입니다. 저장·배포 방식은 TODO입니다.

## Runner 격리와 offline Gradle 전략

Issue #1은 로컬 또는 신뢰하는 데모 입력으로 수행한 기술 검증입니다. 임의의 신뢰하지 않는 코드를 공개 서비스에서 안전하게 받을 수 있다는 주장이 아닙니다.

구현·실검증된 실행 경계는 다음과 같습니다.

- image build 단계에서 `gradle:8.10.2-jdk21`과 demo의 JUnit runtime dependency를 준비하고, 실행 시 image 내부 cache seed를 tmpfs의 `GRADLE_USER_HOME`으로 복사합니다.
- 실제 compile과 test는 `gradle --offline --no-daemon`으로 실행합니다. host Gradle cache, credential directory, Docker socket은 mount하지 않습니다.
- candidate workspace와 official test directory만 각각 read-only bind mount로 전달하며, container root filesystem은 `--read-only`입니다.
- container network는 `--network none`, 실행 user는 `1000:1000`, capability는 `ALL` drop, `no-new-privileges`를 적용했습니다.
- 측정해 적용한 제한은 CPU 1, memory 768 MiB, `memory-swap` 768 MiB, PID 128, `nofile` 1024, timeout 60초, captured output 1 MiB입니다. `memory-swap`은 memory를 포함한 총 상한이므로 추가 swap은 없습니다.
- writable 영역은 `/tmp` 64 MiB와 `/workspace` 512 MiB의 tmpfs로 제한했습니다.
- host cache를 mount하지 않은 조건에서 offline Gradle 실행을 확인했고, 모든 종료 경로에서 temporary directory와 Judge container cleanup을 검증했습니다.
- raw Gradle output은 immutable entrypoint의 합산 1 MiB bounded sink에서 소비하고 host로 전달하지 않습니다. DTD와 entity를 거부하는 trusted parser가 JUnit XML을 읽고 예약 exit code로만 suite 판정을 전달합니다.

이 값은 현재 Docker Desktop 환경의 Phase A 기술 검증에서 측정한 값입니다. 프로덕션 보안 기준이나 충분한 리소스 정책으로 간주하지 않습니다. 특히 Gradle compile 단계에서 발생한 일부 인프라 오류가 현재 `COMPILE_FAILED`로 분류될 수 있습니다.

## 안정적인 책임 분리

- Frontend는 향후 정규화된 공개 결과만 표시합니다.
- Backend는 request를 단일 파일 임시 workspace로 변환하고 Runner 프로세스 경계를 호출하며 build output을 verdict로 해석하지 않습니다.
- Runner는 [Judge 입출력 명세](contracts/judge.md)에 따라 입력 검증, container 실행, 결과 정규화, cleanup을 소유합니다.
- problem package는 runtime과 허용 입력을 선언합니다. runtime-only demo file과 production private-pack file은 user workspace나 API result에 들어가지 않습니다.
- deterministic execution만 Judge verdict를 결정하며 LLM output은 판정 근거가 아닙니다.

## 남은 과제(TODO)

- Judge image digest pinning과 재현 가능한 image publication 방식
- production private problem pack의 저장·배포 방식
- 공개 임의 코드 실행 전에 필요한 더 강한 격리와 검증된 리소스 정책
