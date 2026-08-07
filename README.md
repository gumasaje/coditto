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

현재 Phase A의 공개 fixture와 Docker Runner는 구현·실검증됐습니다. Spring Backend 어댑터인 Phase B와 제출/결과 UI인 Phase C는 아직 구현되지 않았습니다. 구현 순서와 모노레포 경계는 [기술 아키텍처](docs/ARCHITECTURE.md), Runner 입출력과 격리 조건은 [Judge 입출력 명세](docs/contracts/judge.md)에 있습니다.

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
