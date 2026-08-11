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

현재 Phase A의 공개 fixture와 Docker Runner, Phase B의 최소 Spring Backend 어댑터, Phase C의 Vite/React 제출 화면이 구현됐습니다. Backend는 `POST /api/submissions`로 `source` 하나를 받아 별도 Python Runner 프로세스를 호출하고, 검증된 정규화 Judge JSON을 반환합니다. 구현 순서와 모노레포 경계는 [기술 아키텍처](docs/ARCHITECTURE.md), Runner 입출력과 격리 조건은 [Judge 입출력 명세](docs/contracts/judge.md)에 있습니다.

## Phase C 로컬 실행

Docker Desktop의 Client와 Server가 모두 실행 중이어야 합니다. 현재 로컬 검증은 Docker 29.6.2, Java 21.0.2, Gradle Wrapper 8.10.2에서 수행했습니다.

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

Frontend는 `http://localhost:5173`에서 열고 `/api` 상대 경로로 Backend `http://localhost:8080`에 요청합니다. Vite proxy 설정은 `frontend/vite.config.ts`에 있습니다. Backend를 먼저 실행한 뒤 Frontend 화면의 textarea에 `RoleService.java` 전체를 붙여 넣고 제출합니다.

샘플 제출 파일은 다음과 같습니다.

```text
judge-runner/testdata/fixed/src/main/java/com/coditto/demo/RoleService.java         → TESTS_PASSED
judge-runner/testdata/buggy/src/main/java/com/coditto/demo/RoleService.java         → TESTS_FAILED
judge-runner/testdata/compile-error/src/main/java/com/coditto/demo/RoleService.java  → COMPILE_FAILED
```

Phase C 실제 상태: 세 샘플을 브라우저에서 제출해 화면과 Backend 응답에서 위 세 `execution` 값을 확인했습니다. Frontend 테스트 8개, Backend 테스트 14개, Runner 테스트 28개, Frontend production build도 통과했습니다. Runner의 target/regression `check.suites` 출력과 Backend의 suites 허용·값 검증은 각각 구현·테스트됐으며, 두 변경을 합친 브라우저 관통 검증은 아직 수행하지 않았습니다. 이 단계에는 DB·인증·비동기 제출·production 배포가 포함되지 않습니다.

## Phase A 검증

Docker Desktop을 실행하고 `docker version`에서 Client와 Server가 모두 보이는 환경에서 다음을 실행합니다.

```bash
# Runner 단위 테스트
python3 -m unittest discover -s judge-runner/tests -v

# Judge 이미지 빌드와 4개 candidate × 3회 Docker 실검증
python3 judge-runner/verify_spike.py
```

전체 검증은 `--network none`, offline Gradle, 정규화된 JSON의 반복 일치와 container cleanup도 함께 확인합니다.

## 향후 방향

- 사용자가 본인의 Codex 또는 Claude Code 계정을 활용하는 작업 흐름
- 공개 GitHub 프로젝트를 기반으로 한 개인화 문제
- AI가 문제 후보를 만들고 Judge가 실행 가능성과 요구 조건 충족 여부를 검증하는 과정
- 채점하지 않는 기술면접 질문 카드와 코드 근거 답안

## 문서

- [저장소 작업 규칙](AGENTS.md)
- [기술 아키텍처](docs/ARCHITECTURE.md)
- [Judge 입출력 명세](docs/contracts/judge.md)
