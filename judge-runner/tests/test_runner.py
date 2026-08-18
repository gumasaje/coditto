from __future__ import annotations

import json
import io
from pathlib import Path
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch


RUNNER_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = RUNNER_ROOT.parent
DOCKER_ROOT = RUNNER_ROOT / "docker"
sys.path.insert(0, str(RUNNER_ROOT))
sys.path.insert(0, str(DOCKER_ROOT))

from coditto_judge.runner import (  # noqa: E402
    ContentError,
    InfrastructureError,
    SubmissionRejected,
    assemble_judge_tests,
    assemble_workspace,
    build_docker_command,
    completed_result,
    completed_test_result,
    execute,
    load_manifest,
    main,
    parse_args,
    preflight_suite_sources,
    resolve_problem_dir,
    result_for_container_exit,
    validate_candidate,
)
from judge_entrypoint import (  # noqa: E402
    ContentMappingError,
    ParserInfrastructureError,
    evaluate_junit_results,
    load_source_map,
    run_command_bounded,
    suite_exit_code,
)
from verify_spike import assert_runtime_version  # noqa: E402


class RunnerContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.problem_dir = REPOSITORY_ROOT / "problems/role-update-001/v1"
        self.manifest = load_manifest(self.problem_dir)

    def test_completed_test_result_includes_both_suites(self) -> None:
        result = completed_test_result(
            self.manifest["problem"], "TESTS_PASSED", "TESTS_PASSED"
        )

        self.assertEqual(
            result,
            {
                "schemaVersion": "draft-v0",
                "problem": {"id": "role-update-001", "version": 1},
                "runStatus": "COMPLETED",
                "check": {
                    "id": "official",
                    "execution": "TESTS_PASSED",
                    "suites": {
                        "target": "TESTS_PASSED",
                        "regression": "TESTS_PASSED",
                    },
                },
            },
        )
        self.assertNotIn("error", result)

    def test_non_test_completed_result_has_no_suites(self) -> None:
        result = completed_result(self.manifest["problem"], "COMPILE_FAILED")

        self.assertNotIn("suites", result["check"])

    def test_workspace_keeps_candidate_and_official_tests_separate(self) -> None:
        candidate = RUNNER_ROOT / "testdata/fixed"
        with tempfile.TemporaryDirectory() as temporary_dir:
            workspace = Path(temporary_dir) / "workspace"
            judge_tests = Path(temporary_dir) / "judge-tests"
            assemble_workspace(self.problem_dir, candidate, workspace)
            suite_sources = preflight_suite_sources(self.problem_dir)
            assemble_judge_tests(self.problem_dir, judge_tests, suite_sources)

            source = workspace / "src/main/java/com/coditto/demo/RoleService.java"
            target_test = judge_tests / "target-tests/src/test/java/com/coditto/demo/RoleServiceTargetTest.java"
            regression_test = judge_tests / "regression-tests/src/test/java/com/coditto/demo/RoleServiceRegressionTest.java"
            self.assertIn("return request.requestedRole()", source.read_text(encoding="utf-8"))
            self.assertTrue(target_test.is_file())
            self.assertTrue(regression_test.is_file())
            self.assertFalse((workspace / "src/test").exists())
            self.assertFalse((workspace / "judge-only").exists())
            self.assertEqual(
                json.loads(
                    (judge_tests / ".coditto-suite-source-map.json").read_text(
                        encoding="utf-8"
                    )
                ),
                suite_sources,
            )

    def test_preflight_builds_target_and_regression_source_map(self) -> None:
        self.assertEqual(
            preflight_suite_sources(self.problem_dir),
            {
                "target": ["com.coditto.demo.RoleServiceTargetTest"],
                "regression": ["com.coditto.demo.RoleServiceRegressionTest"],
            },
        )

    def test_preflight_rejects_empty_suite(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            problem = Path(temporary_dir)
            (problem / "judge-only/target-tests/src/test/java").mkdir(parents=True)
            regression = problem / "judge-only/regression-tests/src/test/java/RegressionTest.java"
            regression.parent.mkdir(parents=True)
            regression.write_text("class RegressionTest {}", encoding="utf-8")

            with self.assertRaises(ContentError):
                preflight_suite_sources(problem)

    def test_preflight_rejects_cross_suite_path_or_fqn_duplicates(self) -> None:
        cases = (
            ("com/example/Test.java", "com/example/Test.java"),
            ("com/example/Test.java", "com.example/Test.java"),
        )
        for target_relative, regression_relative in cases:
            with self.subTest(
                target=target_relative, regression=regression_relative
            ), tempfile.TemporaryDirectory() as temporary_dir:
                problem = Path(temporary_dir)
                for suite, relative in (
                    ("target", target_relative),
                    ("regression", regression_relative),
                ):
                    source = (
                        problem
                        / "judge-only"
                        / f"{suite}-tests/src/test/java"
                        / relative
                    )
                    source.parent.mkdir(parents=True)
                    source.write_text("class Test {}", encoding="utf-8")

                with self.assertRaises(ContentError):
                    preflight_suite_sources(problem)

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

    def test_all_reserved_container_exit_codes_follow_the_contract_table(self) -> None:
        expected = {
            0: ("COMPLETED", "TESTS_PASSED", None),
            20: ("COMPLETED", "COMPILE_FAILED", None),
            21: ("COMPLETED", "TESTS_FAILED", None),
            22: ("COMPLETED", "TESTS_FAILED", None),
            23: ("COMPLETED", "TESTS_FAILED", None),
            24: ("SYSTEM_FAILED", None, "CONTENT_ERROR"),
            25: ("SYSTEM_FAILED", None, "INFRA_ERROR"),
            26: ("COMPLETED", "RESOURCE_LIMITED", None),
            137: ("COMPLETED", "RESOURCE_LIMITED", None),
        }
        for return_code, (status, execution, error_kind) in expected.items():
            with self.subTest(return_code=return_code):
                result, process_exit = result_for_container_exit(
                    self.manifest["problem"], return_code
                )
                self.assertEqual(result["runStatus"], status)
                self.assertEqual(process_exit, 2 if status == "SYSTEM_FAILED" else 0)
                if execution is None:
                    self.assertNotIn("check", result)
                    self.assertEqual(result["error"]["kind"], error_kind)
                else:
                    self.assertEqual(result["check"]["execution"], execution)
                    if execution not in {"TESTS_PASSED", "TESTS_FAILED"}:
                        self.assertNotIn("suites", result["check"])

        with self.assertRaises(InfrastructureError):
            result_for_container_exit(self.manifest["problem"], 30)

    def test_four_fixtures_return_expected_suite_shapes_without_junit_details(self) -> None:
        cases = {
            "buggy": (
                21,
                {
                    "execution": "TESTS_FAILED",
                    "suites": {
                        "target": "TESTS_FAILED",
                        "regression": "TESTS_PASSED",
                    },
                },
            ),
            "fixed": (
                0,
                {
                    "execution": "TESTS_PASSED",
                    "suites": {
                        "target": "TESTS_PASSED",
                        "regression": "TESTS_PASSED",
                    },
                },
            ),
            "regression-error": (
                22,
                {
                    "execution": "TESTS_FAILED",
                    "suites": {
                        "target": "TESTS_PASSED",
                        "regression": "TESTS_FAILED",
                    },
                },
            ),
            "compile-error": (20, {"execution": "COMPILE_FAILED"}),
        }
        sensitive_output = (
            b"RoleServiceTargetTest > appliesTheRequestedRoleWhenTheChangeIsApproved FAILED\n"
            b"expected: <ADMIN> but was: <MEMBER>\n<failure>stack trace</failure>"
        )
        forbidden = (
            "RoleServiceTargetTest",
            "appliesTheRequestedRoleWhenTheChangeIsApproved",
            "expected: <ADMIN>",
            "<failure>",
            "stack trace",
        )
        for case, (return_code, expected_check) in cases.items():
            with self.subTest(case=case):
                stderr = io.StringIO()
                with (
                    patch(
                        "coditto_judge.runner.run_bounded",
                        return_value=(return_code, sensitive_output, None),
                    ),
                    patch("coditto_judge.runner._remove_container"),
                    redirect_stderr(stderr),
                ):
                    result, process_exit = execute(
                        self.problem_dir,
                        self.manifest["problem"],
                        RUNNER_ROOT / "testdata" / case,
                        60,
                        1_048_576,
                        f"coditto-test-{case}",
                    )

                self.assertEqual(process_exit, 0)
                self.assertEqual(result["check"], {"id": "official", **expected_check})
                public_and_diagnostics = json.dumps(result) + stderr.getvalue()
                for value in forbidden:
                    self.assertNotIn(value, public_and_diagnostics)


class TrustedEntrypointTest(unittest.TestCase):
    def write_inputs(
        self,
        root: Path,
        xml: str | None,
        source_map: dict[str, list[str]] | None = None,
    ) -> tuple[Path, Path]:
        xml_dir = root / "xml"
        xml_dir.mkdir()
        if xml is not None:
            (xml_dir / "TEST-results.xml").write_text(xml, encoding="utf-8")
        map_path = root / "source-map.json"
        map_path.write_text(
            json.dumps(
                source_map
                or {
                    "target": ["com.example.TargetTest"],
                    "regression": ["com.example.RegressionTest"],
                }
            ),
            encoding="utf-8",
        )
        return xml_dir, map_path

    def test_maps_nested_classnames_and_all_suite_combinations(self) -> None:
        cases = (
            ("", "", 0, ("TESTS_PASSED", "TESTS_PASSED"), 0),
            ("<failure/>", "", 1, ("TESTS_FAILED", "TESTS_PASSED"), 21),
            ("", "<error/>", 1, ("TESTS_PASSED", "TESTS_FAILED"), 22),
            ("<failure/>", "<error/>", 1, ("TESTS_FAILED", "TESTS_FAILED"), 23),
        )
        for target_child, regression_child, status, suites, exit_code in cases:
            with self.subTest(suites=suites), tempfile.TemporaryDirectory() as temporary_dir:
                xml = (
                    "<testsuite>"
                    '<testcase classname="com.example.TargetTest$Nested">'
                    f"{target_child}</testcase>"
                    '<testcase classname="com.example.RegressionTest">'
                    f"{regression_child}</testcase>"
                    "</testsuite>"
                )
                xml_dir, map_path = self.write_inputs(Path(temporary_dir), xml)

                actual = evaluate_junit_results(xml_dir, map_path, status)

                self.assertEqual(actual, suites)
                self.assertEqual(suite_exit_code(*actual), exit_code)

    def test_skipped_is_a_suite_failure_not_a_system_error(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            xml = (
                "<testsuite>"
                '<testcase classname="com.example.TargetTest"><skipped/></testcase>'
                '<testcase classname="com.example.RegressionTest"/>'
                "</testsuite>"
            )
            xml_dir, map_path = self.write_inputs(Path(temporary_dir), xml)

            suites = evaluate_junit_results(xml_dir, map_path, 0)

            self.assertEqual(suites, ("TESTS_FAILED", "TESTS_PASSED"))

    def test_xml_infrastructure_errors_are_rejected(self) -> None:
        cases = {
            "missing XML": None,
            "malformed XML": "<testsuite>",
            "missing classname": "<testsuite><testcase/></testsuite>",
            "DOCTYPE": (
                '<!DOCTYPE testsuite [<!ENTITY secret "value">]>'
                '<testsuite><testcase classname="com.example.TargetTest">'
                "&secret;</testcase></testsuite>"
            ),
            "zero regression tests": (
                '<testsuite><testcase classname="com.example.TargetTest"/></testsuite>'
            ),
        }
        for label, xml in cases.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temporary_dir:
                xml_dir, map_path = self.write_inputs(Path(temporary_dir), xml)

                with self.assertRaises(ParserInfrastructureError):
                    evaluate_junit_results(xml_dir, map_path, 0)

    def test_unmapped_classname_is_a_content_error(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            xml = '<testsuite><testcase classname="com.example.UnknownTest"/></testsuite>'
            xml_dir, map_path = self.write_inputs(Path(temporary_dir), xml)

            with self.assertRaises(ContentMappingError):
                evaluate_junit_results(xml_dir, map_path, 0)

    def test_all_xml_is_validated_before_classname_mapping(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            xml_dir, map_path = self.write_inputs(root, None)
            (xml_dir / "A-unmapped.xml").write_text(
                '<testsuite><testcase classname="com.example.UnknownTest"/></testsuite>',
                encoding="utf-8",
            )
            (xml_dir / "B-malformed.xml").write_text("<testsuite>", encoding="utf-8")

            with self.assertRaises(ParserInfrastructureError):
                evaluate_junit_results(xml_dir, map_path, 0)

    def test_duplicate_source_map_is_a_content_error(self) -> None:
        cases = (
            {
                "target": ["com.example.SameTest"],
                "regression": ["com.example.SameTest"],
            },
            {
                "target": ["com.example.TargetTest", "com.example.TargetTest"],
                "regression": ["com.example.RegressionTest"],
            },
        )
        for source_map in cases:
            with self.subTest(source_map=source_map), tempfile.TemporaryDirectory() as temporary_dir:
                root = Path(temporary_dir)
                _, map_path = self.write_inputs(root, None, source_map)

                with self.assertRaises(ContentMappingError):
                    load_source_map(map_path)

    def test_gradle_status_and_xml_contradictions_are_infrastructure_errors(self) -> None:
        cases = (
            (0, "<failure/>"),
            (1, ""),
        )
        for status, target_child in cases:
            with self.subTest(status=status), tempfile.TemporaryDirectory() as temporary_dir:
                xml = (
                    "<testsuite>"
                    '<testcase classname="com.example.TargetTest">'
                    f"{target_child}</testcase>"
                    '<testcase classname="com.example.RegressionTest"/>'
                    "</testsuite>"
                )
                xml_dir, map_path = self.write_inputs(Path(temporary_dir), xml)

                with self.assertRaises(ParserInfrastructureError):
                    evaluate_junit_results(xml_dir, map_path, status)

    def test_bounded_command_discards_output_and_reports_limit(self) -> None:
        status, consumed, exceeded = run_command_bounded(
            [sys.executable, "-c", "print('sensitive-test-output')"], 4
        )

        self.assertNotEqual(status, 0)
        self.assertGreater(consumed, 4)
        self.assertTrue(exceeded)


if __name__ == "__main__":
    unittest.main()
