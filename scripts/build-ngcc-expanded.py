#!/usr/bin/env python3
"""Build NGCC reference instances as browser WASM, one parameter at a time.

Requires the pinned ngcc-harness checkout and emcc/em++. Failed builds retain
their logs but never publish an unverified module. Usage:
  python3 scripts/build-ngcc-expanded.py /path/to/ngcc-harness hash-01
"""

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CATALOG = json.loads((REPO / "public/pqc-practice/ngcc-catalog.json").read_text())
WASM = REPO / "public/pqc-practice/wasm"
LOGS = REPO / "work/ngcc-wasm-rebuild"
EXISTING = {"kem-01", "kem-08", "kem-27", "kem-39", "sign-01"}
EXPORTS = {
    "hash": ["malloc", "free", "lab_seed", "lab_digest_bytes", "lab_hash"],
    "kem": ["malloc", "free", "lab_seed", "lab_public_bytes", "lab_private_bytes",
            "lab_output_bytes", "lab_shared_bytes", "lab_keypair", "lab_enc", "lab_dec"],
    "sig": ["malloc", "free", "lab_seed", "lab_public_bytes", "lab_private_bytes",
            "lab_output_bytes", "lab_keypair", "lab_sign", "lab_verify"],
    "kex": ["malloc", "free", "lab_seed", "lab_public_bytes", "lab_private_bytes",
            "lab_state_a_bytes", "lab_state_b_bytes", "lab_shared_bytes", "lab_total_bytes",
            "lab_passes", "lab_exchange", "lab_session_reset", "lab_session_start",
            "lab_session_pass", "lab_session_derive", "lab_session_data", "lab_session_bytes", "lab_session_match"],
}


def run(command, cwd, seconds, logfile):
    try:
        done = subprocess.run(command, cwd=cwd, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, text=True, errors="replace", timeout=seconds)
        logfile.write_text("$ " + shlex.join(map(str, command)) + "\n" + done.stdout)
        return "ok" if done.returncode == 0 else "compile_failed"
    except subprocess.TimeoutExpired as error:
        output = error.stdout or b""
        if isinstance(output, bytes):
            output = output.decode(errors="replace")
        logfile.write_text("$ " + shlex.join(map(str, command)) + "\n" + output + "\nTIMEOUT\n")
        return "timeout"


def instances(candidate_dir):
    result = subprocess.run(["make", "-s", "list"], cwd=candidate_dir,
                            capture_output=True, text=True, timeout=10)
    if result.returncode:
        raise ValueError(result.stderr[-500:])
    found = []
    for line in result.stdout.splitlines():
        match = re.match(r"^(.+?)\s+->\s+(.+)$", line.strip())
        if match:
            found.append((match[1].strip(), match[2].strip()))
    return found


def metadata(candidate_dir, label, name):
    LOGS.mkdir(parents=True, exist_ok=True)
    path = LOGS / (name + ".meta")
    command = ["make", "-s", "-f", "Makefile", "-f", str(REPO / "scripts/ngcc-wasm-introspect.mk"),
               "ngcc-wasm-introspect", f"NGCC_WASM_LABEL={label}", f"NGCC_WASM_META={path}"]
    completed = subprocess.run(command, cwd=candidate_dir, capture_output=True, text=True, timeout=10)
    if completed.returncode:
        raise ValueError(completed.stderr[-500:])
    lines = path.read_text().splitlines()
    if len(lines) != 8 or not lines[4]:
        raise ValueError("Makefile did not expose a complete object list")
    return dict(zip(("id", "type", "label", "source", "objects", "defines", "libraries", "cxx"), lines))


def build_one(harness, candidate, parameter, index, label, limit, native_status="passed"):
    name = f"ngcc-{candidate['id']}-{index}"
    cd = harness / candidate["id"]
    logfile = LOGS / f"{name}.log"
    target = WASM / (name + ".mjs")
    record = dict(id=candidate["id"], parameter=index, label=parameter["label"],
                  source=parameter["source"], log=str(logfile.relative_to(REPO)))
    native_ok = native_status == "passed"
    try:
        meta = metadata(cd, label, name)
        if Path(meta["source"]).as_posix().rstrip("/") != parameter["source"].rstrip("/"):
            raise ValueError("Makefile source directory differs from the catalog")
        if not (cd / meta["source"]).is_dir():
            raise FileNotFoundError("submitted source directory missing")
        if candidate["type"] not in EXPORTS:
            raise ValueError("browser bridge for this API type is not ready")
        objects = meta["objects"].split()
        build = ["make", "-s", "-j2", "CC=emcc", "CXX=em++", "build/" + label + "/shim.o", *objects]
        status = run(build, cd, limit, logfile)
        if status != "ok":
            record["status"] = status
            return record
        flags = ["-O2", "-sMODULARIZE=1", "-sEXPORT_ES6=1", "-sENVIRONMENT=web,worker,node",
                 "-sFILESYSTEM=0", "-sALLOW_MEMORY_GROWTH=1", "-sNO_EXIT_RUNTIME=1",
                 "-sSTACK_SIZE=16777216", "-sEXPORTED_RUNTIME_METHODS=HEAPU8",
                 "-sEXPORTED_FUNCTIONS=" + json.dumps(["_" + item for item in EXPORTS[candidate["type"]]], separators=(",", ":"))]
        bridge_flags = ["-DNGCC_BUILD_" + candidate["type"].upper()]
        if candidate["type"] == "hash":
            bridge_flags.append("-DNGCC_DIGEST_BITS=" + str(parameter["sizes"]["DigestBits"]))
        if candidate["type"] == "kex":
            bridge_flags.append("-DNGCC_KEX_PASSES=" + str(parameter["sizes"]["Passes"]))
        compiler = "em++" if meta["cxx"].strip() else "emcc"
        link = [compiler, *flags, *bridge_flags, "-I" + str(harness / "api"),
                str(REPO / "scripts/ngcc-wasm-bridge.c"),
                str(cd / "build" / label / "shim.o"), *(str(cd / obj) for obj in objects),
                "-lm", *shlex.split(meta["libraries"]), "-o", str(target)]
        link_log = LOGS / f"{name}.link.log"
        status = run(link, REPO, limit, link_log)
        if status != "ok":
            target.unlink(missing_ok=True)
            target.with_suffix(".wasm").unlink(missing_ok=True)
            record.update(status=status, log=str(link_log.relative_to(REPO)))
            return record
        check_log = LOGS / f"{name}.check.log"
        check = ["node", str(REPO / "scripts/check-ngcc-module.mjs"),
                 str(target), candidate["id"], str(index)]
        if candidate["type"] == "hash" and native_ok:
            vectors = LOGS / f"{candidate['id']}.vectors.json"
            if not vectors.is_file() or str(index) not in json.loads(vectors.read_text()):
                raise ValueError("native digest vectors are missing for this parameter")
            check.append(str(vectors))
        status = run(check, REPO, 30, check_log)
        if status != "ok":
            target.unlink(missing_ok=True)
            target.with_suffix(".wasm").unlink(missing_ok=True)
            record.update(status="timeout" if status == "timeout" else "runtime_failed",
                          log=str(check_log.relative_to(REPO)))
            return record
        if native_ok:
            record["status"] = "verified"
            record["module"] = target.relative_to(REPO).as_posix()
        else:
            target.unlink(missing_ok=True)
            target.with_suffix(".wasm").unlink(missing_ok=True)
            record["status"] = "native_timeout" if native_status == "timeout" else "native_failed"
        return record
    except (ValueError, FileNotFoundError, KeyError, subprocess.TimeoutExpired) as error:
        target.unlink(missing_ok=True)
        target.with_suffix(".wasm").unlink(missing_ok=True)
        logfile.write_text(str(error) + "\n")
        record["status"] = "source_missing" if isinstance(error, FileNotFoundError) else "compile_failed"
        return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("harness", type=Path)
    parser.add_argument("candidate", nargs="?", help="candidate ID; omit for all")
    parser.add_argument("--seconds", type=int, default=90, help="per compile/link step timeout")
    parser.add_argument("--from-index", type=int, default=0)
    parser.add_argument("--to-index", type=int, default=1_000_000)
    parser.add_argument("--native-unverified", action="store_true",
                        help="still attempt WASM compile after a native KAT failure, but never publish it")
    parser.add_argument("--native-status-file", type=Path,
                        help="per-parameter native KAT result JSON, retaining timeout vs failure")
    args = parser.parse_args()
    harness = args.harness.resolve()
    if not shutil.which("emcc") or not shutil.which("em++"):
        parser.error("Emscripten emcc and em++ must be on PATH")
    if not (harness / "api/link_rules.mk").is_file():
        parser.error("a checked-out ngcc-harness source tree is required")
    LOGS.mkdir(parents=True, exist_ok=True)
    WASM.mkdir(parents=True, exist_ok=True)
    candidates = [c for c in CATALOG["candidates"] if not args.candidate or c["id"] == args.candidate]
    if not candidates:
        parser.error("unknown candidate ID")
    records = []
    native_results = json.loads(args.native_status_file.read_text()) if args.native_status_file else {}
    destination = LOGS / "results.json"
    destination.write_text("[]\n")
    for candidate in candidates:
        cd = harness / candidate["id"]
        try:
            labels = instances(cd) if (cd / "Makefile").is_file() else []
        except (ValueError, subprocess.TimeoutExpired) as error:
            print(f"{candidate['id']}: cannot read curated Makefile: {error}", file=sys.stderr)
            labels = []
        for index, parameter in enumerate(candidate["parameters"]):
            if not args.from_index <= index < args.to_index:
                continue
            if candidate["id"] in EXISTING and index < 3:
                record = dict(id=candidate["id"], parameter=index, label=parameter["label"],
                              status="existing_verified")
            else:
                match = next((label for label, source in labels if source.rstrip("/") == parameter["source"].rstrip("/")), None)
                if match is None:
                    record = dict(id=candidate["id"], parameter=index, label=parameter["label"],
                                  source=parameter["source"], status="source_missing")
                else:
                    native_status = native_results.get(str(index), "failed" if args.native_unverified else "passed")
                    record = build_one(harness, candidate, parameter, index, match, args.seconds, native_status)
            records.append(record)
            print(json.dumps(record, ensure_ascii=False), flush=True)
            destination.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
