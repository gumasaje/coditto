# Coditto 기술 아키텍처

**상태:** Phase A fixture·Runner 및 Issue #6·#15·#27 공개 PBL 문제 패키지 구현, Phase B 문제 조회·problemId 제출·면접 질문 API 구현, Phase C 문제 목록·작업공간·Monaco 에디터·problemId 제출·면접 카드 UI 구현

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

Issue #1을 완료하려면 아래 세 단계가 모두 필요합니다. 현재는 Phase A, Phase B, Phase C(문제 목록·작업공간·Monaco 연결)가 구현됐습니다.

| 단계 | 범위 | 현재 상태 | 완료 증거 |
| --- | --- | --- | --- |
| A. Fixture와 Runner | `problems/`, `judge-runner/`; 로컬 또는 신뢰하는 데모 입력을 Docker에서 검증 | 완료 | `role-update-001`과 공개 PBL 문제 11개를 실제 격리 Docker에서 반복 검증하고 상세 비노출 및 매 실행 후 cleanup 확인 |
| B. API 어댑터 | `backend/`; 문제 목록·상세와 problemId 기반 submission endpoint가 실제 Runner 호출 | 구현 | 기동 시 검증된 문제 인덱스를 만들고 endpoint 통합 테스트가 요청 문제별 Python subprocess의 정규화 결과를 반환하며 malformed stdout·timeout을 `SYSTEM_FAILED`/`INFRA_ERROR`로 처리함 |
| C. 제출과 결과 UI | `frontend/`; 문제 목록, 작업공간, 제출과 결과 화면 | 구현 | `GET /api/problems` 목록·카테고리 탭, `GET /api/problems/{problemId}` Incident 패널과 Monaco 작업공간, 파일 트리·읽기 전용 문맥, `problemId`/`version`/`source` 제출, `TESTS_PASSED` 뒤에만 면접 카드 표시, `check.suites`가 있으면 목표/회귀 통과·실패를 나눠 표시 |

PostgreSQL, 인증, browser IDE, 최종 UI, queue, A–E/Mutant 평가, 생성 또는 개인화 문제는 Issue #1 범위 밖입니다.

## 모노레포 경계

| 경로 | 책임 | 현재 상태 |
| --- | --- | --- |
| `frontend/` | 문제 목록·작업공간·제출/결과·면접 카드, 이후 제품 UI | Phase C 목록·작업공간·Monaco·제출·면접 카드 구현 |
| `backend/` | 문제 catalog와 Issue #1 Runner 어댑터, 독립 면접 질문 생성 API, 이후 session과 persistence | Phase B 문제 조회·problemId 제출·면접 질문 API 구현 |
| `judge-runner/` | 입력 검증, 격리 실행, 결과 정규화, cleanup | Phase A 구현 완료 |
| `problems/` | 공개 demo fixture, 품질 검토된 Java·Spring 문제와 problem-package 계약 | Phase A, Issue #6·#15·#27 구현 |

각 디렉터리는 의미 있는 구현 또는 설정이 생길 때만 만듭니다. Backend는 기동 시 `problems/`의 JSON 문법 `manifest.yaml`, statement와 명시적으로 공개된 base 파일을 검증해 immutable 인덱스를 만들며, 잘못된 패키지는 경고 로그를 남기고 제외합니다. 조회와 `POST /api/interview-questions`는 이 인덱스만 사용하고 `judge-only/` 자산을 읽거나 반환하지 않습니다. 면접 질문 요청은 candidate base와 source에서 unified diff를 만들고 statement·diff만 OpenAI Chat Completions에 전달하며, 빈 diff·key 미설정·provider 오류·timeout·출력 오류는 `UNAVAILABLE`으로 정규화한다. 이 경로는 Runner를 호출하지 않는다. `POST /api/submissions`는 최대 128 KiB raw JSON body의 필수 `problemId`, 선택 `version`, `source` 하나를 받아 게시된 문제의 candidate 계약을 검증한 뒤 `allowedPaths[0]`에 임시로 기록하고, API가 생성한 container name과 함께 별도 `python3 judge-runner/run.py` subprocess를 호출합니다. raw transport 상한은 JSON escaping으로 인한 byte 확장을 수용하기 위해 source 계약보다 크며, source 자체의 최대 16 KiB 상한을 완화하지 않습니다. API 프로세스는 제출 코드를 load 또는 실행하지 않으며 Runner diagnostics는 API response에 전달하지 않습니다. stdout가 정확히 한 줄의 계약 JSON이고 요청한 problem identity와 contract shape를 만족할 때만 이를 반환합니다. Runner 실행 실패·timeout·비계약 stdout은 `SYSTEM_FAILED`/`INFRA_ERROR`로 반환하며, terminal path마다 Python process tree와 해당 Judge container를 정리한 후 temporary candidate directory를 제거합니다. 배포 시 problem root와 Runner script path는 절대 경로 configuration으로 지정해야 합니다.

## Phase A 구현 경계

공개 fixture는 `problems/role-update-001/v1/`에 있으며, `manifest.yaml`은 Java 21, Gradle 8.10.2, Judge 이미지, 수정 허용 경로, 파일 수와 byte 제한을 선언합니다. Runner CLI는 다음 프로세스 경계로 실행합니다.

```bash
python3 judge-runner/run.py --candidate judge-runner/testdata/fixed
```

Runner는 stdout에 기계가 읽는 JSON 하나만 출력하고 정규화된 Docker·stage 진단은 stderr로 분리합니다. test 실행 하나로 compile과 test를 함께 수행하고, build가 실패하면서 JUnit XML이 하나도 없을 때만 compile 전용 실행을 덧붙여 `COMPILE_FAILED`와 infrastructure fault를 구분합니다. 단일 test 실행의 JUnit XML은 immutable parser가 target/regression suite로 사후 배정합니다. 결과 형태는 [Judge 입출력 명세](contracts/judge.md)를 따릅니다.

`judge-runner/verify_spike.py`는 Judge 이미지를 빌드한 뒤 네 candidate를 각각 3회 실행합니다. 기대한 `execution`과 `suites`, 정규화된 JSON의 반복 일치, test 상세 비노출, 실제 `--network none`과 mount 경계, non-root 이미지, 남은 container가 없는지를 함께 검사합니다.

## 품질 검토된 공개 문제

Issue #6은 공개 PBL 저장소의 검토된 버그 후보를 기존 problem-package와 Runner
계약으로 게시했고, Issue #15는 편집 파일 길이와 공개 프로젝트 문맥을 기준으로
재평가했습니다. Issue #27은 같은 저장소의 원본 동작, 주차별 단계 차이와 검토된
회귀를 다시 검토해 공개 PBL 문제를 11개로 확장했습니다. 품질 기준과 교체 기록은
[문제 콘텐츠 품질 문서](problem-quality-issue-15.md), 문제별 출처와 선정·제외 근거는
[Issue #27 문제 선정 기록](problem-selection-issue-27.md)이 소유합니다.

- `member-list-exposure-001`은 인메모리 repository가 mutable 내부 목록을 노출하는
  버그이며 기존 Java/JUnit Judge 이미지를 재사용합니다.
- `member-name-uniqueness-001`은 이름 변경의 중복 검증 누락을 JPA와 H2 in-memory
  DB로 재현하며, 짧은 편집 파일과 관련 DTO·domain·repository·exception을 공개
  문맥으로 제공합니다. Spring/JPA/H2 의존성을 offline cache에 준비하는
  `coditto/judge-java21-springboot:phase-a` sibling 이미지를 사용합니다.
- Issue #27의 일반 Java 문제 네 개는 생성자 입력 검증, 정책 조건 결합, 읽기 전용
  저장소의 쓰기 제어와 파트 인덱스 동기화를 다룹니다.
- Issue #27의 Spring 문제 다섯 개는 연관 삭제, 상위 멤버 존재 확인, 역할별 수정
  검증, 과제 제목 입력 검증과 부분 검색을 JPA와 H2 in-memory로 재현합니다.

Runner는 공개 PBL 문제 11개에 공통 `execute.sh`와 `judge_entrypoint.py`, 동일한 resource와
격리 옵션을 적용합니다. image 선택은 manifest의 `runtime.image`만 따르며 Runner에
framework 분기를 추가하지 않습니다. 이 결정은
[ADR 0001](adr/0001-problem-specific-judge-images.md)에 기록합니다.

`judge-runner/verify_pbl_problems.py`는 기존 Java image를 재빌드하지 않고 Spring
image만 빌드한 뒤, 공개 PBL 문제 11개의 buggy/fixed candidate를 각각 3회 실행합니다.
최초 후보 검토 범위는 [Issue #6 문제 후보 선정 기록](problem-selection-issue-6.md),
현재 게시 기준은 [Issue #15 문제 콘텐츠 품질 기준](problem-quality-issue-15.md),
확장 검토 범위는 [Issue #27 문제 선정 기록](problem-selection-issue-27.md)에 남깁니다.

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
- 측정해 적용한 제한은 CPU 2, memory 768 MiB, `memory-swap` 768 MiB, PID 128, `nofile` 1024, timeout 60초, captured output 1 MiB입니다. CPU 상한은 예약이 아니라 상한이므로, 전역 동시 실행 제한이 없는 현재 상태에서 제출이 겹치면 각 container가 그만큼 느려집니다. `memory-swap`은 memory를 포함한 총 상한이므로 추가 swap은 없습니다.
- writable 영역은 `/tmp` 64 MiB와 `/workspace` 512 MiB의 tmpfs로 제한했습니다.
- host cache를 mount하지 않은 조건에서 offline Gradle 실행을 확인했고, 모든 종료 경로에서 temporary directory와 Judge container cleanup을 검증했습니다.
- raw Gradle output은 immutable entrypoint의 합산 1 MiB bounded sink에서 소비하고 host로 전달하지 않습니다. DTD와 entity를 거부하는 trusted parser가 JUnit XML을 읽고 예약 exit code로만 suite 판정을 전달합니다.

판정 지연은 `judge-runner/benchmark_judge.py`로 측정합니다. 이 스크립트는 준비된 candidate를 반복 실행해 p50과 p95를 남기며, core 수와 Docker stack이 다르면 비교가 성립하지 않으므로 배포 host에서 실행한 값만 기준으로 씁니다.

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
