#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shlex
import subprocess
import sys
import time
from typing import Any

from coditto_judge.runner import load_manifest, validate_manifest_identity


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
RUNNER = REPOSITORY_ROOT / "judge-runner/run.py"
SPRING_DOCKERFILE = REPOSITORY_ROOT / "judge-runner/docker/springboot/Dockerfile"
PROBLEMS = {
    "member-list-exposure-001": {"version": 1, "spring": False},
    "lion-constructor-validation-001": {"version": 1, "spring": False},
    "submission-policy-conjunction-001": {"version": 1, "spring": False},
    "mock-repository-write-guard-001": {"version": 1, "spring": False},
    "member-part-index-delete-001": {"version": 1, "spring": False},
    "member-name-uniqueness-001": {"version": 1, "spring": True},
    "member-assignment-cascade-delete-001": {"version": 1, "spring": True},
    "assignment-member-existence-001": {"version": 1, "spring": True},
    "lion-update-role-validation-001": {"version": 1, "spring": True},
    "assignment-title-validation-001": {"version": 1, "spring": True},
    "assignment-title-search-001": {"version": 1, "spring": True},
}
EXPECTED = {
    "buggy": {
        "execution": "TESTS_FAILED",
        "suites": {"target": "TESTS_FAILED", "regression": "TESTS_PASSED"},
    },
    "fixed": {
        "execution": "TESTS_PASSED",
        "suites": {"target": "TESTS_PASSED", "regression": "TESTS_PASSED"},
    },
}
COMMON_FORBIDDEN_OUTPUT = (
    "AssertionFailedError",
    "expected: <",
    "<failure",
    "<error",
    "stack trace",
)
EXTERNAL_DATABASE_MARKERS = (
    "db_url",
    "db_username",
    "db_password",
    "mysql",
    "communications link failure",
    "connection refused",
    "connection timed out",
)


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


def inspect_image(image: str) -> tuple[str, str]:
    result = run(["docker", "image", "inspect", "--format", "{{.Id}} {{.Config.User}}", image])
    require_success(result, f"image inspect for {image}")
    values = result.stdout.strip().split(maxsplit=1)
    if len(values) != 2:
        raise RuntimeError(f"unexpected image inspect output for {image}: {result.stdout!r}")
    image_id, user = values
    if user != "1000:1000":
        raise RuntimeError(f"Judge image is not configured as non-root: {image} user={user}")
    return image_id, user


def assert_runtime_version(image: str) -> None:
    result = run(
        ["docker", "run", "--rm", "--network", "none", "--entrypoint", "gradle", image, "--version"],
        timeout=30,
    )
    require_success(result, f"offline runtime version check for {image}")
    java_21_markers = ("Launcher JVM:  21", "JVM:          21")
    if "Gradle 8.10.2" not in result.stdout or not any(
        marker in result.stdout for marker in java_21_markers
    ):
        raise RuntimeError(f"unexpected Judge runtime for {image}:\n{result.stdout}")


def expected_json(problem_id: str, version: int, check: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": "draft-v0",
        "problem": {"id": problem_id, "version": version},
        "runStatus": "COMPLETED",
        "check": {"id": "official", **check},
    }


def assert_isolated_command(stderr: str, label: str) -> None:
    command_line = next(
        (
            line.removeprefix("docker command: ")
            for line in stderr.splitlines()
            if line.startswith("docker command: ")
        ),
        None,
    )
    if command_line is None:
        raise RuntimeError(f"{label} did not report its Docker command")
    command = shlex.split(command_line)
    network_index = command.index("--network") if "--network" in command else -1
    if network_index < 0 or command[network_index + 1 : network_index + 2] != ["none"]:
        raise RuntimeError(f"{label} did not execute Docker with --network none")

    mounts = [command[index + 1] for index, token in enumerate(command[:-1]) if token == "--mount"]
    if len(mounts) != 2:
        raise RuntimeError(f"{label} used unexpected host mounts: {mounts}")
    targets = {part for mount in mounts for part in mount.split(",") if part.startswith("target=")}
    if targets != {"target=/input", "target=/judge-tests"}:
        raise RuntimeError(f"{label} used unexpected mount targets: {targets}")
    if any("docker.sock" in mount or "/.gradle" in mount for mount in mounts):
        raise RuntimeError(f"{label} exposed a forbidden host mount")


def official_test_details(problem_id: str) -> tuple[str, ...]:
    test_root = REPOSITORY_ROOT / "problems" / problem_id / "v1/judge-only"
    details: list[str] = []
    for source in sorted(test_root.glob("*-tests/src/test/java/**/*.java")):
        details.append(source.stem)
        text = source.read_text(encoding="utf-8")
        details.extend(re.findall(r"\bvoid\s+([A-Za-z][A-Za-z0-9_]*)\s*\(", text))
    return tuple(details)


def assert_no_forbidden_output(output: str, problem_id: str) -> None:
    forbidden = COMMON_FORBIDDEN_OUTPUT + official_test_details(problem_id)
    for marker in forbidden:
        if marker in output:
            raise RuntimeError(f"{problem_id} exposed forbidden test detail: {marker!r}")


def assert_spring_packages_use_only_h2() -> None:
    for problem_id, profile in PROBLEMS.items():
        if not profile["spring"]:
            continue

        problem_dir = REPOSITORY_ROOT / "problems" / problem_id / "v1"
        build_text = (problem_dir / "base/build.gradle").read_text(encoding="utf-8").lower()
        if "testimplementation 'com.h2database:h2'" not in build_text:
            raise RuntimeError(f"{problem_id} does not declare H2 as a test dependency")
        for marker in ("mysql", "springdoc"):
            if marker in build_text:
                raise RuntimeError(f"{problem_id} includes forbidden dependency marker: {marker}")

        forbidden_files = (
            problem_dir / "base/src/main/resources/application.properties",
            problem_dir / "base/src/test/java/com/likelion/springboot/ApplicationTests.java",
        )
        if any(path.exists() for path in forbidden_files):
            raise RuntimeError(f"{problem_id} includes external DB properties or ApplicationTests")

        regression_sources = sorted(
            (problem_dir / "judge-only/regression-tests/src/test/java").rglob("*.java")
        )
        regression_text = "\n".join(
            source.read_text(encoding="utf-8") for source in regression_sources
        )
        if "jdbc:h2:mem:" not in regression_text:
            raise RuntimeError(f"{problem_id} does not assert the H2 in-memory JDBC URL")


def assert_no_external_database_markers(output: str, label: str) -> None:
    lowered = output.lower()
    for marker in EXTERNAL_DATABASE_MARKERS:
        if marker in lowered:
            raise RuntimeError(f"{label} contains an external database/network marker: {marker!r}")


def verify_problem(problem_id: str) -> dict[str, Any]:
    profile = PROBLEMS[problem_id]
    version = profile["version"]
    problem_dir = REPOSITORY_ROOT / "problems" / problem_id / f"v{version}"
    manifest = load_manifest(problem_dir)
    validate_manifest_identity(manifest, {"id": problem_id, "version": version})
    image = manifest["runtime"]["image"]

    image_id, _ = inspect_image(image)
    assert_runtime_version(image)
    cases: list[dict[str, Any]] = []
    for case, expected_check in EXPECTED.items():
        observed: list[dict[str, Any]] = []
        durations: list[float] = []
        for iteration in range(1, 4):
            candidate = REPOSITORY_ROOT / "judge-runner/testdata" / problem_id / case
            started = time.perf_counter()
            result = run(
                [
                    sys.executable,
                    "-B",
                    str(RUNNER),
                    "--problem-id",
                    problem_id,
                    "--version",
                    str(version),
                    "--candidate",
                    str(candidate),
                ],
                timeout=90,
            )
            durations.append(time.perf_counter() - started)
            require_success(result, f"{problem_id} {case} run {iteration}")
            output_lines = result.stdout.strip().splitlines()
            if len(output_lines) != 1:
                raise RuntimeError(f"{problem_id} {case} run {iteration} did not emit one JSON line")
            parsed = json.loads(output_lines[0])
            expected = expected_json(problem_id, version, expected_check)
            if parsed != expected:
                raise RuntimeError(
                    f"{problem_id} {case} run {iteration} returned {parsed!r}, expected {expected!r}"
                )
            label = f"{problem_id} {case} run {iteration}"
            assert_isolated_command(result.stderr, label)
            combined_output = result.stdout + result.stderr
            assert_no_forbidden_output(combined_output, problem_id)
            if profile["spring"]:
                assert_no_external_database_markers(combined_output, label)
            observed.append(parsed)

        if any(value != observed[0] for value in observed[1:]):
            raise RuntimeError(f"{problem_id} {case} JSON was not deterministic")
        cases.append(
            {
                "case": case,
                "execution": expected_check["execution"],
                "suites": expected_check["suites"],
                "runs": 3,
                "seconds": [round(value, 3) for value in durations],
                "jsonStable": True,
            }
        )

    return {"problemId": problem_id, "image": image, "imageId": image_id, "cases": cases}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify the published PBL problem pack against the real Judge"
    )
    parser.add_argument(
        "--skip-image-build",
        action="store_true",
        help=(
            "Verify against the Judge images already present on the host. Use this on a "
            "deployment server, where deploy/scripts/build-judge-images.sh already built "
            "them and rebuilding here would replace the image that is serving submissions. "
            "This skips the external-database marker check on Spring Boot build output; the "
            "static package check and the per-run output checks still run."
        ),
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    docker_version = run(["docker", "version", "--format", "{{.Server.Version}}"])
    require_success(docker_version, "Docker daemon check")
    assert_spring_packages_use_only_h2()

    java_manifest = load_manifest(REPOSITORY_ROOT / "problems/member-list-exposure-001/v1")
    java_image = java_manifest["runtime"]["image"]
    java_image_id_before, _ = inspect_image(java_image)

    spring_manifest = load_manifest(REPOSITORY_ROOT / "problems/member-name-uniqueness-001/v1")
    spring_image = spring_manifest["runtime"]["image"]
    build_seconds: float | None = None
    if args.skip_image_build:
        # Only prove the image is present and non-root; rebuilding it here would
        # swap the image that is currently serving submissions.
        inspect_image(spring_image)
    else:
        build_started = time.perf_counter()
        # `--progress` is a BuildKit flag. Omitting it keeps this runnable on hosts
        # that only have the legacy builder, and BuildKit still prints plain output
        # when stdout is not a terminal.
        build = run(
            [
                "docker",
                "build",
                "--file",
                str(SPRING_DOCKERFILE),
                "--tag",
                spring_image,
                ".",
            ],
            timeout=1200,
        )
        require_success(build, "Spring Boot Judge image build")
        assert_no_external_database_markers(build.stdout + build.stderr, "Spring Boot image build")
        build_seconds = time.perf_counter() - build_started

    summaries = [verify_problem(problem_id) for problem_id in PROBLEMS]
    java_image_id_after, _ = inspect_image(java_image)
    if java_image_id_after != java_image_id_before:
        raise RuntimeError("existing Java Judge image changed during PBL verification")

    containers = run(
        ["docker", "ps", "--all", "--filter", "name=coditto-judge-", "--format", "{{.Names}}"]
    )
    require_success(containers, "Judge container cleanup check")
    if containers.stdout.strip():
        raise RuntimeError(f"Judge containers were not cleaned up: {containers.stdout.strip()}")

    print(
        json.dumps(
            {
                "dockerServerVersion": docker_version.stdout.strip(),
                "javaImageReused": True,
                "javaImageIdBefore": java_image_id_before,
                "javaImageIdAfter": java_image_id_after,
                "springImageBuilt": not args.skip_image_build,
                "springImageBuildSeconds": (
                    None if build_seconds is None else round(build_seconds, 3)
                ),
                "springDatabase": "H2 in-memory",
                "runtimeNetwork": "none",
                "problems": summaries,
                "cleanupVerified": True,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
        print(f"PBL problem verification failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
