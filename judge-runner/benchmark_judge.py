#!/usr/bin/env python3
"""Measure Judge wall-clock latency for a problem's prepared candidates.

Run this on the deployment host. A developer machine has a different core
count and a different Docker stack, so its numbers cannot be compared against
a server baseline. Record the output before and after any change that is meant
to make judging faster, and compare the same case at the same run count.

Percentiles use nearest-rank. With the default five runs p95 is therefore the
slowest of the five, not a distribution estimate; raise --runs when a change
looks marginal.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import statistics
import subprocess
import sys
import time
from typing import Any

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
RUNNER = REPOSITORY_ROOT / "judge-runner/run.py"
TESTDATA = REPOSITORY_ROOT / "judge-runner/testdata"
DEFAULT_PROBLEM = "role-update-001"
DEFAULT_CASES = ("fixed", "buggy")


def candidate_dir(problem_id: str, case: str) -> Path:
    """Resolve a prepared candidate, preferring the problem's own fixtures."""
    for path in (TESTDATA / problem_id / case, TESTDATA / case):
        if path.is_dir():
            return path
    raise RuntimeError(f"no prepared candidate for problem={problem_id} case={case}")


def percentile(sorted_values: list[float], fraction: float) -> float:
    rank = max(1, min(len(sorted_values), int(-(-fraction * len(sorted_values) // 1))))
    return sorted_values[rank - 1]


def measure(problem_id: str, version: int, case: str, runs: int) -> dict[str, Any]:
    candidate = candidate_dir(problem_id, case)
    seconds: list[float] = []
    executions: set[str] = set()
    for iteration in range(1, runs + 1):
        started = time.perf_counter()
        result = subprocess.run(
            [
                sys.executable, "-B", str(RUNNER),
                "--problem-id", problem_id,
                "--version", str(version),
                "--candidate", str(candidate),
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )
        elapsed = time.perf_counter() - started
        lines = result.stdout.strip().splitlines()
        if len(lines) != 1:
            raise RuntimeError(f"{problem_id} {case} run {iteration} did not emit one JSON line")
        parsed = json.loads(lines[0])
        executions.add(parsed.get("check", {}).get("execution", parsed.get("runStatus", "UNKNOWN")))
        seconds.append(elapsed)

    if len(executions) != 1:
        raise RuntimeError(f"{problem_id} {case} produced mixed results: {sorted(executions)}")

    ordered = sorted(seconds)
    return {
        "case": case,
        "execution": executions.pop(),
        "runs": runs,
        "p50": round(statistics.median(ordered), 3),
        "p95": round(percentile(ordered, 0.95), 3),
        "min": round(ordered[0], 3),
        "max": round(ordered[-1], 3),
        "seconds": [round(value, 3) for value in ordered],
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--problem-id", default=DEFAULT_PROBLEM)
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument(
        "--case",
        action="append",
        dest="cases",
        help=f"prepared candidate to measure; repeatable (default: {', '.join(DEFAULT_CASES)})",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    if args.runs < 1:
        raise RuntimeError("--runs must be at least 1")
    cases = args.cases or list(DEFAULT_CASES)

    docker_version = subprocess.run(
        ["docker", "version", "--format", "{{.Server.Version}}"],
        capture_output=True, text=True,
    )
    if docker_version.returncode != 0:
        raise RuntimeError(f"Docker daemon check failed: {docker_version.stderr.strip()}")

    print(
        json.dumps(
            {
                "dockerServerVersion": docker_version.stdout.strip(),
                "problemId": args.problem_id,
                "version": args.version,
                "percentileMethod": "nearest-rank",
                "cases": [measure(args.problem_id, args.version, case, args.runs) for case in cases],
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
        print(f"Judge benchmark failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
