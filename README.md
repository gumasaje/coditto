# Coditto

Coditto는 AI 코딩 도구로 프로젝트를 만드는 개발 취준생과 주니어 개발자가 기존 코드의 버그를 고치고, 테스트로 수정의 안전성을 확인하는 디버깅 훈련 프로젝트입니다. AI의 설명이 아니라 실행한 빌드와 테스트가 판정 근거가 됩니다.

## 목표 학습 흐름

아래 전체 흐름은 아직 완성되지 않았으며, 제품이 목표로 하는 경험입니다.

1. 증상과 재현 절차가 담긴 작은 문제를 확인합니다.
2. AI를 포함한 도구로 코드를 수정하고 테스트를 보강합니다.
3. Judge 결과를 확인하고 다시 수정합니다.
4. 기능 수정, 테스트 검증, 참고 패치 비교를 통해 수정 근거를 설명합니다.

## 첫 실행 가능한 핵심 흐름

[Issue #1](https://github.com/gumasaje/coditto/issues/1)은 첫 실행 가능한 핵심 흐름으로, Java 21/Gradle/JUnit 공개 demo fixture를 최소 화면에서 제출해 실제 Docker Judge 결과를 다시 표시하는 것을 목표로 합니다. `TESTS_PASSED`, `TESTS_FAILED`, `COMPILE_FAILED`를 구분하며 PostgreSQL, 인증, 브라우저 IDE, 최종 UI, A–E·Mutant 평가는 포함하지 않습니다.

현재 Phase A의 공개 fixture와 Docker Runner, Phase B의 Spring Backend 어댑터, Phase C의 문제 목록·작업공간·제출 화면이 구현됐습니다. Backend는 기동 시 공개 문제 패키지를 인덱싱해 `GET /api/problems`와 `GET /api/problems/{problemId}`로 목록·상세를 반환합니다. `POST /api/submissions`는 `problemId`, 선택 `version`, 단일 `source`를 받아 별도 Python Runner 프로세스를 호출하고 검증된 정규화 Judge JSON을 반환합니다. Frontend는 이 계약으로 문제 목록과 작업공간을 채우고 선택한 `problemId`로 제출합니다. 작업공간 에디터는 Monaco이며 `files[].path` 트리와 `editable: false` 읽기 전용 문맥을 표시합니다. 별도 `POST /api/interview-questions`는 공개 statement와 submitted unified diff만 OpenAI에 전달해 질문 카드 세 개를 생성하며, key가 없거나 생성에 실패하면 Judge 경로와 독립적으로 `UNAVAILABLE`을 반환합니다. Frontend는 판정이 `COMPLETED`/`TESTS_PASSED`일 때만 이 endpoint를 호출하고, `UNAVAILABLE`이면 카드 영역만 접습니다. 구현 순서와 모노레포 경계는 [기술 아키텍처](docs/ARCHITECTURE.md), Runner 입출력과 격리 조건은 [Judge 입출력 명세](docs/contracts/judge.md)에 있습니다.

Issue #6에서는 공개 PBL 저장소에서 검토한 Java 문제를 `problems/`에 추가했고,
Issue #15에서는 문제 품질 기준으로 기존 콘텐츠를 재평가했습니다. Issue #27에서는
같은 두 저장소의 원본 동작, 주차별 단계 차이와 검토된 회귀를 다시 검토해 공개 PBL
문제를 11개로 확장했습니다. 일반 Java 문제는 기존 Judge 이미지를 재사용하고, Spring
문제는 같은 격리 경계를 공유하는 별도 dependency-cache image를 사용합니다. 기준과
교체 기록은 [문제 콘텐츠 품질 문서](docs/problem-quality-issue-15.md), 확장 후보와 출처는
[Issue #27 문제 선정 기록](docs/problem-selection-issue-27.md)에 있습니다.

## Phase C 로컬 실행

아래 명령은 각 component 실행용입니다. Frontend는 문제 목록에서 문제를 고른 뒤 작업공간에서 제출합니다.

Docker Desktop의 Client와 Server가 모두 실행 중이어야 합니다. 현재 로컬 검증은 Docker 29.7.2, Java 21.0.2, Gradle Wrapper 8.10.2에서 수행했습니다.

```bash
# Backend 테스트와 실행
cd backend
./gradlew test
./gradlew bootRun

# 별도 터미널: Frontend 설치, 테스트, production build, 개발 서버
cd frontend
npm install
npm test
npm run build
npm run dev
```

Frontend는 `http://localhost:5173`에서 열고 `/api` 상대 경로로 Backend `http://localhost:8080`에 요청합니다. Vite proxy 설정은 `frontend/vite.config.ts`에 있습니다. Backend를 먼저 실행한 뒤 문제 목록에서 문제를 선택하고, 작업공간에 미리 채워진 코드를 수정해 제출합니다.

면접 질문 API의 OpenAI 호출은 선택 사항입니다. `OPENAI_API_KEY`가 비어 있으면 외부 요청 없이 `UNAVAILABLE` 응답을 반환합니다.

샘플 제출 파일은 다음과 같습니다.

```text
judge-runner/testdata/fixed/src/main/java/com/coditto/demo/RoleService.java         → TESTS_PASSED
judge-runner/testdata/buggy/src/main/java/com/coditto/demo/RoleService.java         → TESTS_FAILED
judge-runner/testdata/compile-error/src/main/java/com/coditto/demo/RoleService.java  → COMPILE_FAILED
```

Phase C 실제 상태: Frontend는 문제 목록·카테고리 탭·작업공간에서 `problemId` 기반 제출을 사용하고, Monaco 에디터와 파일 트리·읽기 전용 문맥을 표시하며, `COMPLETED`/`TESTS_PASSED`일 때만 면접 질문 카드를 별도 호출합니다. Frontend 테스트와 production build가 통과했습니다. 이전 Backend·Runner 관통 검증에서 `buggy`/`fixed`/`compile-error`/`regression-error` 네 candidate가 기대한 `suites`·`execution`과 일치했습니다. 이 단계에는 DB·인증·비동기 제출·production 배포가 포함되지 않으며, 목표/회귀 suites 화면 표시는 후속 Frontend 범위입니다.

## Phase A 검증

Docker Desktop을 실행하고 `docker version`에서 Client와 Server가 모두 보이는 환경에서 다음을 실행합니다.

```bash
# Runner 단위 테스트
python3 -m unittest discover -s judge-runner/tests -v

# Judge 이미지 빌드와 4개 candidate × 3회 Docker 실검증
python3 judge-runner/verify_spike.py
```

전체 검증은 `--network none`, offline Gradle, target/regression 구분, test 상세 비노출, 정규화된 JSON의 반복 일치와 container cleanup도 함께 확인합니다.

## 공개 문제 검증

기존 Java Judge 이미지가 로컬에 있고 Docker Desktop의 Client와 Server가 실행 중인
환경에서 다음 명령을 실행합니다. 검증기는 기존 Java 이미지를 재빌드하지 않고
Spring Boot/JPA/H2 sibling 이미지만 빌드합니다.

```bash
python3 -B judge-runner/verify_pbl_problems.py
```

공개 PBL 문제 11개의 buggy/fixed candidate를 각각 3회, 총 66회 실행해
`TESTS_FAILED`/`TESTS_PASSED`, target/regression suite, H2 in-memory 사용,
`--network none`, non-root 실행, 공식 테스트 상세 비노출과 container cleanup을
확인합니다.

## 향후 방향

- 사용자가 본인의 Codex 또는 Claude Code 계정을 활용하는 작업 흐름
- 공개 GitHub 프로젝트를 기반으로 한 개인화 문제
- AI가 문제 후보를 만들고 Judge가 실행 가능성과 요구 조건 충족 여부를 검증하는 과정
- 채점하지 않는 기술면접 질문 카드와 코드 근거 답안

## 문서

- [기여 및 협업 규칙](CONTRIBUTING.md)
- [저장소 작업 규칙](AGENTS.md)
- [기술 아키텍처](docs/ARCHITECTURE.md)
- [Judge 입출력 명세](docs/contracts/judge.md)
- [문제 콘텐츠 품질 기준과 재평가 기록](docs/problem-quality-issue-15.md)
- [Issue #27 PBL 문제 선정 기록](docs/problem-selection-issue-27.md)
