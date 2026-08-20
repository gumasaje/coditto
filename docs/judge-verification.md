# Judge 검증 절차

판정 경로를 바꿨을 때 실행하는 검증입니다. Runner 입출력과 격리 조건 자체는 [Judge 입출력 명세](contracts/judge.md)에 있습니다.

## 사전 조건

Docker Desktop을 실행하고 `docker version`에서 Client와 Server가 모두 보여야 합니다. 로컬 검증은 Docker 29.7.2, Java 21.0.2, Gradle Wrapper 8.10.2에서 수행했습니다.

Judge 이미지는 `deploy/scripts/build-judge-images.sh`로 미리 빌드해 둡니다. Runner는 실행 시 `--pull never`를 사용하므로, manifest가 참조하는 tag의 이미지가 로컬에 없으면 제출이 실패합니다.

## 명령

```bash
# Runner 단위 테스트
python3 -m unittest discover -s judge-runner/tests -v

# Judge 이미지 빌드와 4개 candidate × 3회 Docker 실검증
python3 judge-runner/verify_spike.py

# 공개 PBL 문제 11개의 buggy/fixed candidate × 3회, 총 66회 실행
python3 -B judge-runner/verify_pbl_problems.py
```

## 각 스크립트가 확인하는 것

`verify_spike.py`는 `--network none`, offline Gradle, 목표·회귀 구분, 공식 테스트 상세 비노출, 정규화된 JSON의 반복 일치와 container cleanup을 확인합니다.

`verify_pbl_problems.py`는 위에 더해 H2 in-memory 사용과 non-root 실행을 확인합니다. 기존 Java 이미지를 재빌드하지 않고 Spring Boot 계열 dependency-cache 이미지만 빌드합니다.

## 배포 서버에서 실행할 때

두 스크립트 모두 `--skip-image-build`를 붙입니다. 옵션을 빠뜨리면 지금 제출을 처리하고 있는 이미지가 교체됩니다. release 검증 절차 전체와 그 이유는 [가비아 VPS 첫 배포 가이드](deployment.md)의 "배포 전 검증"에 있습니다.

`verify_pbl_problems.py`는 66회의 실제 Judge 실행을 수행하므로 서버 사양이 작으면 오래 걸립니다. 문제 이미지나 Runner 격리 정책이 바뀌었을 때는 생략하지 않습니다.

## 로컬에서 판정 4종을 직접 확인할 때

작업공간 없이 Runner만 호출해 네 가지 결과를 재현할 수 있는 샘플 제출입니다.

```text
judge-runner/testdata/fixed/src/main/java/com/coditto/demo/RoleService.java          → TESTS_PASSED
judge-runner/testdata/buggy/src/main/java/com/coditto/demo/RoleService.java          → TESTS_FAILED
judge-runner/testdata/compile-error/src/main/java/com/coditto/demo/RoleService.java  → COMPILE_FAILED
```

## 판정 소요 시간 측정

성능 변경 전후를 같은 기준으로 비교할 때 사용합니다. 개발 머신 수치는 core 수와 Docker 스택이 달라 서버 기준값으로 쓸 수 없으므로 배포 서버에서 실행합니다.

```bash
python3 judge-runner/benchmark_judge.py
```

배포 서버 기준 p50은 Java 문제 약 6초, Spring 문제 약 11초입니다. 단계별 개선 기록과 남은 후보는 [Issue #62](https://github.com/gumasaje/coditto/issues/62)에 있습니다.
