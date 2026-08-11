import json
import pathlib
import signal
import subprocess
import sys
import time

candidate = pathlib.Path(sys.argv[sys.argv.index("--candidate") + 1])
container_name = sys.argv[sys.argv.index("--container-name") + 1]
source = (candidate / "src/main/java/com/coditto/demo/RoleService.java").read_text()

if source in {"timeout", "record-cleanup"}:
    pathlib.Path(__file__).with_name("runner-record.txt").write_text(
        f"{candidate}\n{container_name}\n")

if source.startswith("exact-source"):
    pathlib.Path(__file__).with_name("runner-record.txt").write_text(
        f"{candidate}\n{container_name}\n{len(source.encode())}\n")

if source == "stubborn-descendant":
    record_path = pathlib.Path(__file__).with_name("runner-record.txt")
    child = subprocess.Popen([
        sys.executable,
        "-c",
        (
            "import pathlib, signal, sys, time; "
            "candidate = pathlib.Path(sys.argv[1]); record = pathlib.Path(sys.argv[2]); "
            "signal.signal(signal.SIGTERM, lambda *_: record.open('a').write("
            "'descendant-saw-candidate=' + str(candidate.exists()) + '\\n')); "
            "time.sleep(30)"
        ),
        str(candidate),
        str(record_path),
    ])
    record_path.write_text(f"{candidate}\n{container_name}\n{child.pid}\n")
    time.sleep(30)

if source == "timeout":
    time.sleep(2)
elif source == "not-json":
    print("runner diagnostic")
    print("{}")
    raise SystemExit(2)
elif source == "rejected":
    print(json.dumps({
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": 1},
        "runStatus": "REJECTED",
        "error": {"kind": "INVALID_SUBMISSION"},
    }, separators=(",", ":")))
    raise SystemExit(2)
elif source == "system-failed":
    print(json.dumps({
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": 1},
        "runStatus": "SYSTEM_FAILED",
        "error": {"kind": "CONTENT_ERROR"},
    }, separators=(",", ":")))
    raise SystemExit(2)
elif source == "wrong-exit":
    print(json.dumps({
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": 1},
        "runStatus": "COMPLETED",
        "check": {"id": "official", "execution": "TESTS_PASSED"},
    }, separators=(",", ":")))
    raise SystemExit(2)
elif source == "wrong-types":
    print(json.dumps({
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": "1"},
        "runStatus": "COMPLETED",
        "check": {"id": "official", "execution": "TESTS_PASSED"},
    }, separators=(",", ":")))
elif source == "oversized-stdout":
    print("x" * (64 * 1024 + 1))
    raise SystemExit(0)
elif source == "suites":
    print(json.dumps({
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": 1},
        "runStatus": "COMPLETED",
        "check": {
            "id": "official",
            "execution": "TESTS_PASSED",
            "suites": {"target": "TESTS_FAILED", "regression": "TESTS_PASSED"},
        },
    }, separators=(",", ":")))
    raise SystemExit(0)
elif source == "compile-failed":
    print(json.dumps({
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": 1},
        "runStatus": "COMPLETED",
        "check": {"id": "official", "execution": "COMPILE_FAILED"},
    }, separators=(",", ":")))
    raise SystemExit(0)
elif source.startswith("invalid-suites-"):
    suites = {"target": "TESTS_PASSED", "regression": "TESTS_FAILED"}
    if source == "invalid-suites-target-value":
        suites["target"] = "TESTS_SKIPPED"
    elif source == "invalid-suites-regression-value":
        suites["regression"] = "TESTS_SKIPPED"
    elif source == "invalid-suites-missing-target":
        del suites["target"]
    elif source == "invalid-suites-non-textual-regression":
        suites["regression"] = True
    elif source == "invalid-suites-extra-field":
        suites["details"] = []
    elif source == "invalid-suites-non-object":
        suites = []
    print(json.dumps({
        "schemaVersion": "draft-v0",
        "problem": {"id": "role-update-001", "version": 1},
        "runStatus": "COMPLETED",
        "check": {
            "id": "official",
            "execution": "TESTS_FAILED",
            "suites": suites,
        },
    }, separators=(",", ":")))
    raise SystemExit(0)

execution = "TESTS_PASSED" if "return requestedRole" in source else "TESTS_FAILED"
print(json.dumps({
    "schemaVersion": "draft-v0",
    "problem": {"id": "role-update-001", "version": 1},
    "runStatus": "COMPLETED",
    "check": {"id": "official", "execution": execution},
}, separators=(",", ":")))
