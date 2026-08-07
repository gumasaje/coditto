from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import selectors
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from typing import Any


SCHEMA_VERSION = "draft-v0"
DEFAULT_PROBLEM_ID = "role-update-001"
DEFAULT_VERSION = 1
DEFAULT_TIMEOUT_SECONDS = 60
DEFAULT_OUTPUT_LIMIT_BYTES = 1_048_576
PROBLEM_ID_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


class SubmissionRejected(Exception):
    pass


class ContentError(Exception):
    pass


class InfrastructureError(Exception):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ContentError(message)


def load_manifest(problem_dir: Path) -> dict[str, Any]:
    manifest_path = problem_dir / "manifest.yaml"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ContentError(f"invalid problem manifest: {exc}") from exc

    _require(manifest.get("schemaVersion") == SCHEMA_VERSION, "unsupported manifest schema")
    problem = manifest.get("problem")
    runtime = manifest.get("runtime")
    candidate = manifest.get("candidate")
    _require(isinstance(problem, dict), "manifest.problem must be an object")
    _require(isinstance(runtime, dict), "manifest.runtime must be an object")
    _require(isinstance(candidate, dict), "manifest.candidate must be an object")
    _require(isinstance(problem.get("id"), str), "problem id must be a string")
    _require(isinstance(problem.get("version"), int), "problem version must be an integer")
    _require(isinstance(runtime.get("image"), str), "runtime image must be a string")
    allowed_paths = candidate.get("allowedPaths")
    _require(isinstance(allowed_paths, list) and allowed_paths, "allowedPaths must not be empty")
    _require(all(isinstance(path, str) for path in allowed_paths), "allowedPaths must contain strings")
    _require(isinstance(candidate.get("maxFiles"), int), "maxFiles must be an integer")
    _require(isinstance(candidate.get("maxBytes"), int), "maxBytes must be an integer")

    for required_dir in ("base", "judge-only/target-tests", "judge-only/regression-tests"):
        _require((problem_dir / required_dir).is_dir(), f"missing problem directory: {required_dir}")
    _require((problem_dir / "judge-only/reference.patch").is_file(), "missing reference.patch")
    return manifest


def resolve_problem_dir(repository_root: Path, problem_id: str, version: int) -> Path:
    requested_path = Path(problem_id)
    if requested_path.is_absolute():
        raise SubmissionRejected("problem id must not be an absolute path")
    if ".." in requested_path.parts:
        raise SubmissionRejected("problem id must not contain traversal")
    if PROBLEM_ID_PATTERN.fullmatch(problem_id) is None:
        raise SubmissionRejected("problem id must be a lowercase slug")
    if version <= 0:
        raise SubmissionRejected("problem version must be positive")

    problems_root = (repository_root.resolve() / "problems").resolve()
    problem_dir = (problems_root / problem_id / f"v{version}").resolve()
    try:
        problem_dir.relative_to(problems_root)
    except ValueError as exc:
        raise SubmissionRejected("resolved problem path escapes the problems root") from exc
    return problem_dir


def validate_manifest_identity(
    manifest: dict[str, Any], requested_problem: dict[str, Any]
) -> None:
    if manifest["problem"] != requested_problem:
        raise ContentError("problem manifest identity does not match the request")


def _validate_relative_path(relative: Path, allowed_paths: set[str]) -> None:
    value = relative.as_posix()
    if relative.is_absolute() or ".." in relative.parts or value not in allowed_paths:
        raise SubmissionRejected(f"candidate path is not allowed: {value}")


def validate_candidate(candidate_dir: Path, manifest: dict[str, Any]) -> list[Path]:
    if candidate_dir.is_symlink() or not candidate_dir.is_dir():
        raise SubmissionRejected("candidate must be a real directory")

    candidate_contract = manifest["candidate"]
    allowed_paths = set(candidate_contract["allowedPaths"])
    files: list[Path] = []
    total_bytes = 0

    for root, directories, names in os.walk(candidate_dir, followlinks=False):
        root_path = Path(root)
        for directory in directories:
            path = root_path / directory
            if path.is_symlink():
                raise SubmissionRejected(f"symlinks are not allowed: {path.relative_to(candidate_dir)}")
        for name in names:
            path = root_path / name
            relative = path.relative_to(candidate_dir)
            if path.is_symlink() or not path.is_file():
                raise SubmissionRejected(f"only regular files are allowed: {relative}")
            _validate_relative_path(relative, allowed_paths)
            total_bytes += path.stat().st_size
            files.append(path)

    if not files:
        raise SubmissionRejected("candidate must contain at least one file")
    if len(files) > candidate_contract["maxFiles"]:
        raise SubmissionRejected("candidate file-count limit exceeded")
    if total_bytes > candidate_contract["maxBytes"]:
        raise SubmissionRejected("candidate byte limit exceeded")
    return sorted(files)


def _assert_safe_problem_tree(root: Path) -> None:
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ContentError(f"problem package contains a symlink: {path.relative_to(root)}")


def assemble_workspace(problem_dir: Path, candidate_dir: Path, destination: Path) -> None:
    manifest = load_manifest(problem_dir)
    candidate_files = validate_candidate(candidate_dir, manifest)
    _assert_safe_problem_tree(problem_dir)

    shutil.copytree(problem_dir / "base", destination, dirs_exist_ok=True)
    for source in candidate_files:
        relative = source.relative_to(candidate_dir)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def assemble_judge_tests(problem_dir: Path, destination: Path) -> None:
    _assert_safe_problem_tree(problem_dir / "judge-only")
    for name in ("target-tests", "regression-tests"):
        shutil.copytree(problem_dir / "judge-only" / name, destination / name)


def build_docker_command(
    image: str,
    workspace: Path,
    judge_tests: Path,
    container_name: str,
) -> list[str]:
    return [
        "docker",
        "run",
        "--rm",
        "--name",
        container_name,
        "--network",
        "none",
        "--pull",
        "never",
        "--read-only",
        "--user",
        "1000:1000",
        "--cpus",
        "1.0",
        "--memory",
        "768m",
        "--memory-swap",
        "768m",
        "--pids-limit",
        "128",
        "--ulimit",
        "nofile=1024:1024",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=64m,uid=1000,gid=1000",
        "--tmpfs",
        "/workspace:rw,nosuid,size=512m,uid=1000,gid=1000",
        "--mount",
        f"type=bind,source={workspace},target=/input,readonly",
        "--mount",
        f"type=bind,source={judge_tests},target=/judge-tests,readonly",
        image,
    ]


def _remove_container(container_name: str) -> None:
    try:
        subprocess.run(
            ["docker", "rm", "--force", container_name],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        pass


def run_bounded(
    command: list[str],
    container_name: str,
    timeout_seconds: int,
    output_limit_bytes: int,
) -> tuple[int | None, bytes, str | None]:
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    except OSError as exc:
        raise InfrastructureError(f"could not start Docker: {exc}") from exc

    assert process.stdout is not None
    os.set_blocking(process.stdout.fileno(), False)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    output = bytearray()
    deadline = time.monotonic() + timeout_seconds
    limit_reason: str | None = None

    try:
        while True:
            if time.monotonic() >= deadline:
                limit_reason = "timeout"
                _remove_container(container_name)
                break

            for key, _ in selector.select(timeout=0.1):
                try:
                    chunk = os.read(key.fd, 8192)
                except BlockingIOError:
                    continue
                if chunk:
                    output.extend(chunk)
                    if len(output) > output_limit_bytes:
                        limit_reason = "output"
                        _remove_container(container_name)
                        break
                else:
                    selector.unregister(key.fileobj)

            if limit_reason is not None:
                break
            if process.poll() is not None and not selector.get_map():
                break

        if process.poll() is None:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        return process.returncode, bytes(output[:output_limit_bytes]), limit_reason
    finally:
        selector.close()
        process.stdout.close()


def completed_result(problem: dict[str, Any], execution: str) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "problem": {"id": problem["id"], "version": problem["version"]},
        "runStatus": "COMPLETED",
        "check": {"id": "official", "execution": execution},
    }


def error_result(problem: dict[str, Any], status: str, kind: str) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "problem": {"id": problem["id"], "version": problem["version"]},
        "runStatus": status,
        "error": {"kind": kind},
    }


def execute(
    problem_dir: Path,
    requested_problem: dict[str, Any],
    candidate_dir: Path,
    timeout_seconds: int,
    output_limit_bytes: int,
) -> tuple[dict[str, Any], int]:
    try:
        manifest = load_manifest(problem_dir)
        validate_manifest_identity(manifest, requested_problem)
        problem = requested_problem
    except ContentError as exc:
        print(str(exc), file=sys.stderr)
        return error_result(requested_problem, "SYSTEM_FAILED", "CONTENT_ERROR"), 2

    container_name = f"coditto-judge-{uuid.uuid4().hex}"
    try:
        with tempfile.TemporaryDirectory(prefix="coditto-judge-") as temporary_dir:
            workspace = Path(temporary_dir) / "input"
            judge_tests = Path(temporary_dir) / "judge-tests"
            workspace.mkdir()
            assemble_workspace(problem_dir, candidate_dir, workspace)
            assemble_judge_tests(problem_dir, judge_tests)
            command = build_docker_command(
                manifest["runtime"]["image"], workspace, judge_tests, container_name
            )
            print(f"docker command: {shlex.join(command)}", file=sys.stderr)
            return_code, output, limit_reason = run_bounded(
                command,
                container_name,
                timeout_seconds,
                output_limit_bytes,
            )
            if output:
                print("container diagnostics:", file=sys.stderr)
                print(output.decode("utf-8", errors="replace").rstrip(), file=sys.stderr)

            if limit_reason == "timeout":
                return completed_result(problem, "TIMED_OUT"), 0
            if limit_reason == "output" or return_code == 137:
                return completed_result(problem, "RESOURCE_LIMITED"), 0
            if return_code == 0:
                return completed_result(problem, "TESTS_PASSED"), 0
            if return_code == 20:
                return completed_result(problem, "COMPILE_FAILED"), 0
            if return_code == 21:
                return completed_result(problem, "TESTS_FAILED"), 0
            raise InfrastructureError(f"Judge container exited with status {return_code}")
    except SubmissionRejected as exc:
        print(str(exc), file=sys.stderr)
        return error_result(problem, "REJECTED", "INVALID_SUBMISSION"), 2
    except ContentError as exc:
        print(str(exc), file=sys.stderr)
        return error_result(problem, "SYSTEM_FAILED", "CONTENT_ERROR"), 2
    except InfrastructureError as exc:
        print(str(exc), file=sys.stderr)
        return error_result(problem, "SYSTEM_FAILED", "INFRA_ERROR"), 2
    finally:
        _remove_container(container_name)


def parse_args(argv: list[str]) -> argparse.Namespace:
    repository_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Run one Coditto Phase A Judge submission")
    parser.add_argument("--problem-id", default=DEFAULT_PROBLEM_ID)
    parser.add_argument("--version", type=int, default=DEFAULT_VERSION)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--timeout-seconds", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    parser.add_argument("--output-limit-bytes", type=int, default=DEFAULT_OUTPUT_LIMIT_BYTES)
    parser.set_defaults(repository_root=repository_root)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    requested_problem = {"id": args.problem_id, "version": args.version}
    try:
        problem_dir = resolve_problem_dir(args.repository_root, args.problem_id, args.version)
    except SubmissionRejected as exc:
        print(str(exc), file=sys.stderr)
        result = error_result(requested_problem, "REJECTED", "INVALID_SUBMISSION")
        print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
        return 2

    result, exit_code = execute(
        problem_dir,
        requested_problem,
        args.candidate.absolute(),
        args.timeout_seconds,
        args.output_limit_bytes,
    )
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
