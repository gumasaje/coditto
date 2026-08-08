from __future__ import annotations

import json
import io
from pathlib import Path
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout


RUNNER_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = RUNNER_ROOT.parent
sys.path.insert(0, str(RUNNER_ROOT))

from coditto_judge.runner import (  # noqa: E402
    SubmissionRejected,
    assemble_judge_tests,
    assemble_workspace,
    build_docker_command,
    completed_result,
    execute,
    load_manifest,
    main,
    parse_args,
    resolve_problem_dir,
    validate_candidate,
)
from verify_spike import assert_runtime_version  # noqa: E402


class RunnerContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.problem_dir = REPOSITORY_ROOT / "problems/role-update-001/v1"
        self.manifest = load_manifest(self.problem_dir)

    def test_completed_result_matches_issue_one_minimum_json(self) -> None:
        result = completed_result(self.manifest["problem"], "TESTS_PASSED")

        self.assertEqual(
            result,
            {
                "schemaVersion": "draft-v0",
                "problem": {"id": "role-update-001", "version": 1},
                "runStatus": "COMPLETED",
                "check": {"id": "official", "execution": "TESTS_PASSED"},
            },
        )
        self.assertNotIn("error", result)

    def test_workspace_keeps_candidate_and_official_tests_separate(self) -> None:
        candidate = RUNNER_ROOT / "testdata/fixed"
        with tempfile.TemporaryDirectory() as temporary_dir:
            workspace = Path(temporary_dir) / "workspace"
            judge_tests = Path(temporary_dir) / "judge-tests"
            assemble_workspace(self.problem_dir, candidate, workspace)
            assemble_judge_tests(self.problem_dir, judge_tests)

            source = workspace / "src/main/java/com/coditto/demo/RoleService.java"
            target_test = judge_tests / "target-tests/src/test/java/com/coditto/demo/RoleServiceTargetTest.java"
            regression_test = judge_tests / "regression-tests/src/test/java/com/coditto/demo/RoleServiceRegressionTest.java"
            self.assertIn("return requestedRole", source.read_text(encoding="utf-8"))
            self.assertTrue(target_test.is_file())
            self.assertTrue(regression_test.is_file())
            self.assertFalse((workspace / "src/test").exists())
            self.assertFalse((workspace / "judge-only").exists())

    def test_rejects_protected_candidate_path(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            candidate = Path(temporary_dir)
            (candidate / "build.gradle").write_text("plugins {}", encoding="utf-8")

            with self.assertRaises(SubmissionRejected):
                validate_candidate(candidate, self.manifest)

    def test_rejects_candidate_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            candidate = root / "candidate"
            candidate.symlink_to(RUNNER_ROOT / "testdata/fixed", target_is_directory=True)

            with self.assertRaises(SubmissionRejected):
                validate_candidate(candidate, self.manifest)

    def test_docker_command_enforces_spike_isolation_and_narrow_mounts(self) -> None:
        command = build_docker_command(
            "judge-image", Path("/tmp/input"), Path("/tmp/judge-tests"), "judge-name"
        )
        rendered = " ".join(command)

        self.assertIn("--network none", rendered)
        self.assertIn("--read-only", command)
        self.assertIn("--user 1000:1000", rendered)
        self.assertIn("--cap-drop ALL", rendered)
        self.assertIn("--security-opt no-new-privileges", rendered)
        self.assertIn("--cpus 1.0", rendered)
        self.assertIn("--memory 768m", rendered)
        self.assertIn("--pids-limit 128", rendered)
        self.assertIn("--ulimit nofile=1024:1024", rendered)
        self.assertEqual(command.count("--mount"), 2)
        self.assertIn("target=/input,readonly", rendered)
        self.assertIn("target=/judge-tests,readonly", rendered)
        self.assertNotIn(".gradle", rendered)
        self.assertNotIn("docker.sock", rendered)

    def test_manifest_is_json_compatible_yaml(self) -> None:
        parsed = json.loads((self.problem_dir / "manifest.yaml").read_text(encoding="utf-8"))
        self.assertEqual(parsed, self.manifest)

    def test_accepts_gradle_launcher_jvm_version_output(self) -> None:
        assert_runtime_version("Gradle 8.10.2\nLauncher JVM:  21.0.5 (Eclipse Adoptium)")

    def test_rejects_problem_id_traversal_with_one_json_line(self) -> None:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            exit_code = main(
                [
                    "--problem-id",
                    "../role-update-001",
                    "--candidate",
                    str(RUNNER_ROOT / "testdata/fixed"),
                ]
            )

        self.assertEqual(exit_code, 2)
        output_lines = stdout.getvalue().strip().splitlines()
        self.assertEqual(len(output_lines), 1)
        self.assertEqual(json.loads(output_lines[0])["runStatus"], "REJECTED")
        self.assertIn("traversal", stderr.getvalue())

    def test_rejects_absolute_problem_id(self) -> None:
        with self.assertRaises(SubmissionRejected):
            resolve_problem_dir(REPOSITORY_ROOT, "/tmp/problem", 1)

    def test_rejects_non_slug_problem_id(self) -> None:
        with self.assertRaises(SubmissionRejected):
            resolve_problem_dir(REPOSITORY_ROOT, "Role_Update", 1)

    def test_rejects_non_positive_problem_version(self) -> None:
        for version in (0, -1):
            with self.subTest(version=version), self.assertRaises(SubmissionRejected):
                resolve_problem_dir(REPOSITORY_ROOT, "role-update-001", version)

    def test_rejects_resolved_problem_path_outside_problems_root(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            repository = Path(temporary_dir) / "repository"
            outside = Path(temporary_dir) / "outside"
            (repository / "problems").mkdir(parents=True)
            outside.mkdir()
            (repository / "problems/escaped").symlink_to(outside, target_is_directory=True)

            with self.assertRaises(SubmissionRejected):
                resolve_problem_dir(repository, "escaped", 1)

    def test_rejects_manifest_identity_mismatch(self) -> None:
        for requested_problem in (
            {"id": "different-problem", "version": 1},
            {"id": "role-update-001", "version": 2},
        ):
            with self.subTest(requested_problem=requested_problem), redirect_stderr(io.StringIO()):
                result, exit_code = execute(
                    self.problem_dir,
                    requested_problem,
                    RUNNER_ROOT / "testdata/fixed",
                    60,
                    1_048_576,
                )

            self.assertEqual(exit_code, 2)
            self.assertEqual(result["runStatus"], "SYSTEM_FAILED")
            self.assertEqual(result["error"]["kind"], "CONTENT_ERROR")

    def test_accepts_api_generated_container_name(self) -> None:
        args = parse_args(
            [
                "--candidate",
                str(RUNNER_ROOT / "testdata/fixed"),
                "--container-name",
                "coditto-api-0123456789abcdef",
            ]
        )

        self.assertEqual(args.container_name, "coditto-api-0123456789abcdef")


if __name__ == "__main__":
    unittest.main()
