#!/usr/bin/env python3

from __future__ import annotations

import json
from pathlib import Path
import shlex
import subprocess
import sys
import time
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
RUNNER = REPOSITORY_ROOT / "judge-runner/run.py"
DOCKERFILE = REPOSITORY_ROOT / "judge-runner/docker/Dockerfile"
IMAGE = "coditto/judge-java21-gradle:8.10.2-phase-a"
EXPECTED = {
    "buggy": "TESTS_FAILED",
    "fixed": "TESTS_PASSED",
    "compile-error": "COMPILE_FAILED",
    "regression-error": "TESTS_FAILED",
}
VARIABLE_KEYS = {"durationMs", "startedAt", "completedAt"}


def run(command: list[str], *, timeout: int | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=REPOSITORY_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        check=False,
    )


def require_success(process: subprocess.CompletedProcess[str], label: str) -> None:
    if process.returncode != 0:
        raise RuntimeError(
            f"{label} failed with status {process.returncode}\n"
            f"stdout:\n{process.stdout}\nstderr:\n{process.stderr}"
        )


def normalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: normalize(item) for key, item in value.items() if key not in VARIABLE_KEYS}
    if isinstance(value, list):
        return [normalize(item) for item in value]
    return value


def expected_json(execution: str) -> dict[str, Any]:
    return {
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": 1},
        "runStatus": "COMPLETED",
        "check": {"id": "official", "execution": execution},
    }


def assert_runtime_version(output: str) -> None:
    java_21_markers = ("Launcher JVM:  21", "JVM:          21")
    if "Gradle 8.10.2" not in output or not any(marker in output for marker in java_21_markers):
        raise RuntimeError(f"unexpected Judge runtime:\n{output}")


def assert_isolated_command(stderr: str, case: str, iteration: int) -> None:
    command_line = next(
        (line.removeprefix("docker command: ") for line in stderr.splitlines() if line.startswith("docker command: ")),
        None,
    )
    if command_line is None:
        raise RuntimeError(f"{case} run {iteration} did not report its Docker command")
    command = shlex.split(command_line)
    network_index = command.index("--network") if "--network" in command else -1
    if network_index < 0 or command[network_index + 1 : network_index + 2] != ["none"]:
        raise RuntimeError(f"{case} run {iteration} did not execute Docker with --network none")

    mounts = [command[index + 1] for index, token in enumerate(command[:-1]) if token == "--mount"]
    if len(mounts) != 2:
        raise RuntimeError(f"{case} run {iteration} used unexpected host mounts: {mounts}")
    targets = {part for mount in mounts for part in mount.split(",") if part.startswith("target=")}
    if targets != {"target=/input", "target=/judge-tests"}:
        raise RuntimeError(f"{case} run {iteration} used unexpected mount targets: {targets}")
    if any("docker.sock" in mount or "/.gradle" in mount for mount in mounts):
        raise RuntimeError(f"{case} run {iteration} exposed a forbidden host mount")


def main() -> int:
    docker_version = run(["docker", "version", "--format", "{{.Server.Version}}"])
    require_success(docker_version, "Docker daemon check")

    build_started = time.perf_counter()
    build = run(
        ["docker", "build", "--progress", "plain", "--file", str(DOCKERFILE), "--tag", IMAGE, "."],
        timeout=900,
    )
    build_seconds = time.perf_counter() - build_started
    require_success(build, "Judge image build")
    print(build.stdout, file=sys.stderr, end="")
    print(build.stderr, file=sys.stderr, end="")

    inspect = run(["docker", "image", "inspect", "--format", "{{.Id}} {{.Config.User}}", IMAGE])
    require_success(inspect, "Judge image inspect")
    image_id, image_user = inspect.stdout.strip().split(maxsplit=1)
    if image_user != "1000:1000":
        raise RuntimeError(f"Judge image is not configured as non-root: {image_user}")

    runtime = run(
        ["docker", "run", "--rm", "--network", "none", "--entrypoint", "gradle", IMAGE, "--version"],
        timeout=30,
    )
    require_success(runtime, "offline runtime version check")
    assert_runtime_version(runtime.stdout)

    case_summaries: list[dict[str, Any]] = []
    for case, execution in EXPECTED.items():
        normalized_results: list[Any] = []
        durations: list[float] = []
        for iteration in range(1, 4):
            candidate = REPOSITORY_ROOT / "judge-runner/testdata" / case
            started = time.perf_counter()
            result = run(
                [sys.executable, str(RUNNER), "--candidate", str(candidate)],
                timeout=90,
            )
            durations.append(time.perf_counter() - started)
            require_success(result, f"{case} run {iteration}")

            output_lines = result.stdout.strip().splitlines()
            if len(output_lines) != 1:
                raise RuntimeError(f"{case} run {iteration} did not emit exactly one JSON line")
            parsed = json.loads(output_lines[0])
            if parsed != expected_json(execution):
                raise RuntimeError(
                    f"{case} run {iteration} returned {parsed!r}, expected {expected_json(execution)!r}"
                )
            assert_isolated_command(result.stderr, case, iteration)
            if case == "regression-error":
                regression_failure = (
                    "RoleServiceRegressionTest > "
                    "preservesTheCurrentRoleWhenTheChangeIsRejected() FAILED"
                )
                target_failure = (
                    "RoleServiceTargetTest > "
                    "appliesTheRequestedRoleWhenTheChangeIsApproved() FAILED"
                )
                if regression_failure not in result.stderr or target_failure in result.stderr:
                    raise RuntimeError(
                        f"{case} run {iteration} did not isolate the regression-test failure"
                    )
            normalized_results.append(normalize(parsed))

        if any(result != normalized_results[0] for result in normalized_results[1:]):
            raise RuntimeError(f"{case} normalized JSON was not deterministic")
        case_summaries.append(
            {
                "case": case,
                "execution": execution,
                "runs": 3,
                "seconds": [round(duration, 3) for duration in durations],
                "normalizedJsonStable": True,
            }
        )

    containers = run(
        ["docker", "ps", "--all", "--filter", "name=coditto-judge-", "--format", "{{.Names}}"]
    )
    require_success(containers, "Judge container cleanup check")
    if containers.stdout.strip():
        raise RuntimeError(f"Judge containers were not cleaned up: {containers.stdout.strip()}")

    summary = {
        "dockerServerVersion": docker_version.stdout.strip(),
        "image": IMAGE,
        "imageId": image_id,
        "imageBuildSeconds": round(build_seconds, 3),
        "runtimeNetwork": "none",
        "limits": {
            "cpus": 1.0,
            "memory": "768m",
            "pids": 128,
            "timeoutSeconds": 60,
            "outputBytes": 1_048_576,
        },
        "cases": case_summaries,
        "cleanupVerified": True,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
        print(f"spike verification failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
