#!/usr/bin/python3

from __future__ import annotations

import json
import os
from pathlib import Path
import selectors
import signal
import stat
import subprocess
import sys
from typing import Callable, NoReturn
from xml.parsers import expat


OUTPUT_LIMIT_BYTES = 1_048_576
SOURCE_MAP_PATH = Path("/judge-tests/.coditto-suite-source-map.json")
XML_RESULTS_DIR = Path("/workspace/project/build/test-results/test")
SUITES = ("target", "regression")
PASSED = "TESTS_PASSED"
FAILED = "TESTS_FAILED"


class ContentMappingError(Exception):
    pass


class ParserInfrastructureError(Exception):
    pass


def _local_name(name: str) -> str:
    return name.rsplit("}", 1)[-1]


def load_source_map(path: Path) -> dict[str, str]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ParserInfrastructureError("invalid suite source map") from exc

    if not isinstance(value, dict) or set(value) != set(SUITES):
        raise ParserInfrastructureError("invalid suite source map shape")

    suite_fqns: dict[str, set[str]] = {}
    for suite in SUITES:
        entries = value[suite]
        if not isinstance(entries, list) or not all(isinstance(item, str) for item in entries):
            raise ParserInfrastructureError("invalid suite source map entries")
        if len(entries) != len(set(entries)):
            raise ContentMappingError("duplicate entries in suite source map")
        if not entries:
            raise ContentMappingError("suite source map is empty")
        suite_fqns[suite] = set(entries)

    if suite_fqns["target"] & suite_fqns["regression"]:
        raise ContentMappingError("suite source map is ambiguous")

    return {
        fqn: suite
        for suite in SUITES
        for fqn in suite_fqns[suite]
    }


def _reject_unsafe_xml(*_args: object) -> NoReturn:
    raise ParserInfrastructureError("DTD and entities are not allowed")


def _parse_xml_file(
    path: Path,
    consume_testcase: Callable[[str, bool, bool], None] | None = None,
) -> None:
    depth = 0
    testcase_depth: int | None = None
    testcase_classname: str | None = None
    testcase_failed = False
    testcase_has_failure_or_error = False

    def start_element(name: str, attributes: dict[str, str]) -> None:
        nonlocal depth, testcase_depth, testcase_classname, testcase_failed
        nonlocal testcase_has_failure_or_error
        element = _local_name(name)
        if element == "testcase" and testcase_depth is None:
            if "classname" not in attributes:
                raise ParserInfrastructureError("testcase classname is missing")
            testcase_depth = depth
            testcase_classname = attributes["classname"]
            testcase_failed = False
            testcase_has_failure_or_error = False
        elif (
            testcase_depth is not None
            and depth == testcase_depth + 1
            and element in {"failure", "error", "skipped"}
        ):
            testcase_failed = True
            if element in {"failure", "error"}:
                testcase_has_failure_or_error = True
        depth += 1

    def end_element(name: str) -> None:
        nonlocal depth, testcase_depth, testcase_classname, testcase_failed
        nonlocal testcase_has_failure_or_error
        depth -= 1
        if (
            _local_name(name) == "testcase"
            and testcase_depth is not None
            and depth == testcase_depth
        ):
            assert testcase_classname is not None
            if consume_testcase is not None:
                consume_testcase(
                    testcase_classname,
                    testcase_failed,
                    testcase_has_failure_or_error,
                )
            testcase_depth = None
            testcase_classname = None
            testcase_failed = False
            testcase_has_failure_or_error = False

    parser = expat.ParserCreate(namespace_separator="}")
    parser.StartElementHandler = start_element
    parser.EndElementHandler = end_element
    parser.StartDoctypeDeclHandler = _reject_unsafe_xml
    parser.EntityDeclHandler = _reject_unsafe_xml
    parser.UnparsedEntityDeclHandler = _reject_unsafe_xml
    parser.ExternalEntityRefHandler = _reject_unsafe_xml
    parser.SetParamEntityParsing(expat.XML_PARAM_ENTITY_PARSING_NEVER)

    try:
        with path.open("rb") as stream:
            parser.ParseFile(stream)
    except (OSError, expat.ExpatError) as exc:
        raise ParserInfrastructureError("JUnit XML is unreadable or malformed") from exc

    if testcase_depth is not None:
        raise ParserInfrastructureError("JUnit XML ended inside a testcase")


def evaluate_junit_results(
    xml_results_dir: Path,
    source_map_path: Path,
    gradle_status: int,
) -> tuple[str, str]:
    source_map = load_source_map(source_map_path)
    try:
        xml_files = sorted(xml_results_dir.glob("*.xml"))
    except OSError as exc:
        raise ParserInfrastructureError("JUnit XML directory is unreadable") from exc
    if not xml_files:
        raise ParserInfrastructureError("JUnit XML is missing")

    for path in xml_files:
        try:
            mode = path.stat(follow_symlinks=False).st_mode
        except OSError as exc:
            raise ParserInfrastructureError("JUnit XML is unreadable") from exc
        if path.is_symlink() or not stat.S_ISREG(mode):
            raise ParserInfrastructureError("JUnit XML is not a regular file")
        _parse_xml_file(path)

    observed = {suite: 0 for suite in SUITES}
    failed = {suite: False for suite in SUITES}
    has_failure_or_error = False

    def consume_testcase(
        classname: str, testcase_failed: bool, testcase_failure_or_error: bool
    ) -> None:
        nonlocal has_failure_or_error
        fqn = classname.split("$", 1)[0]
        suite = source_map.get(fqn)
        if suite is None:
            raise ContentMappingError("testcase classname is not in the source map")
        observed[suite] += 1
        failed[suite] = failed[suite] or testcase_failed
        has_failure_or_error = has_failure_or_error or testcase_failure_or_error

    for path in xml_files:
        _parse_xml_file(path, consume_testcase)

    if any(observed[suite] == 0 for suite in SUITES):
        raise ParserInfrastructureError("a suite has no observed testcase")
    if gradle_status == 0 and has_failure_or_error:
        raise ParserInfrastructureError("Gradle status contradicts JUnit XML")
    if gradle_status != 0 and not has_failure_or_error:
        raise ParserInfrastructureError("Gradle status contradicts JUnit XML")

    return tuple(FAILED if failed[suite] else PASSED for suite in SUITES)  # type: ignore[return-value]


def suite_exit_code(target: str, regression: str) -> int:
    mapping = {
        (PASSED, PASSED): 0,
        (FAILED, PASSED): 21,
        (PASSED, FAILED): 22,
        (FAILED, FAILED): 23,
    }
    try:
        return mapping[(target, regression)]
    except KeyError as exc:
        raise ParserInfrastructureError("invalid suite result") from exc


def _kill_process_group(process: subprocess.Popen[bytes]) -> None:
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def run_command_bounded(command: list[str], remaining_bytes: int) -> tuple[int, int, bool]:
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    except OSError as exc:
        raise ParserInfrastructureError("could not start Gradle") from exc

    assert process.stdout is not None
    os.set_blocking(process.stdout.fileno(), False)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    consumed = 0
    exceeded = False
    try:
        while True:
            for key, _ in selector.select(timeout=0.1):
                try:
                    chunk = os.read(key.fd, 8192)
                except BlockingIOError:
                    continue
                if chunk:
                    consumed += len(chunk)
                    if consumed > remaining_bytes:
                        exceeded = True
                        _kill_process_group(process)
                        break
                else:
                    selector.unregister(key.fileobj)
            if exceeded:
                break
            if process.poll() is not None and not selector.get_map():
                break
        if process.poll() is None:
            process.wait()
        return process.returncode, consumed, exceeded
    finally:
        selector.close()
        process.stdout.close()


def main() -> int:
    used_output_bytes = 0
    compile_command = [
        "gradle",
        "--offline",
        "--no-daemon",
        "--console=plain",
        "--max-workers=1",
        "compileJava",
        "compileTestJava",
    ]
    test_command = [
        "gradle",
        "--offline",
        "--no-daemon",
        "--console=plain",
        "--max-workers=1",
        "test",
    ]

    try:
        print("judge stage: compile", file=sys.stderr)
        compile_status, consumed, exceeded = run_command_bounded(
            compile_command, OUTPUT_LIMIT_BYTES - used_output_bytes
        )
        used_output_bytes += consumed
        if exceeded:
            print("judge result: resource limited", file=sys.stderr)
            return 26
        if compile_status != 0:
            print("judge result: compile failed", file=sys.stderr)
            return 20

        print("judge stage: test", file=sys.stderr)
        test_status, consumed, exceeded = run_command_bounded(
            test_command, OUTPUT_LIMIT_BYTES - used_output_bytes
        )
        used_output_bytes += consumed
        if exceeded:
            print("judge result: resource limited", file=sys.stderr)
            return 26

        target, regression = evaluate_junit_results(
            XML_RESULTS_DIR, SOURCE_MAP_PATH, test_status
        )
        print(
            f"judge suites: target={target} regression={regression}",
            file=sys.stderr,
        )
        return suite_exit_code(target, regression)
    except ContentMappingError:
        print("judge result: content error", file=sys.stderr)
        return 24
    except ParserInfrastructureError:
        print("judge result: infrastructure error", file=sys.stderr)
        return 25
    except Exception:
        print("judge result: infrastructure error", file=sys.stderr)
        return 25


if __name__ == "__main__":
    raise SystemExit(main())
