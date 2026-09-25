#!/usr/bin/env bash
# Compiles each submitted instance in a bounded CI batch. Failures stay in logs.
set -euo pipefail
ids=$1
harness=$2
mkdir -p work/ngcc-wasm-rebuild
if ! timeout 60 make -s -C "$harness/api" harness > work/ngcc-wasm-rebuild/api.native.log 2>&1; then
  cat work/ngcc-wasm-rebuild/api.native.log
  exit 1
fi
for id in $ids; do
  echo "Attempting $id"
  native_seconds=${NGCC_NATIVE_SECONDS:-75}
  native_budget=${NGCC_NATIVE_BUDGET:-400}
  if ! timeout "$((native_budget + 40))" python3 scripts/check-ngcc-native.py "$harness" "$id" \
       --seconds "$native_seconds" --budget "$native_budget" \
       > "work/ngcc-wasm-rebuild/$id.native.log" 2>&1; then
    echo "Native per-parameter checks incomplete: $id"
  fi
  status_file="work/ngcc-wasm-rebuild/$id.native-status.json"
  if [[ $id == hash-* && -f $status_file ]]; then
    if ! timeout 30 python3 scripts/ngcc-native-hash-vectors.py "$harness" "$id" > "work/ngcc-wasm-rebuild/$id.vectors.log" 2>&1; then
      echo "Native digest extraction failed: $id"
      python3 - "$status_file" <<'PY'
import json, sys
from pathlib import Path
p=Path(sys.argv[1]); data=json.loads(p.read_text())
p.write_text(json.dumps({k: 'failed' if v == 'passed' else v for k,v in data.items()}, indent=2))
PY
    fi
  fi
  timeout 20 make -s -C "$harness/$id" clean > "work/ngcc-wasm-rebuild/$id.clean.log" 2>&1 || true
  mode=(--native-unverified)
  if [[ -f $status_file ]]; then mode=(--native-status-file "$status_file"); fi
  rm -f work/ngcc-wasm-rebuild/results.json
  # Partial per-parameter results are flushed after every attempt.
  timeout 540 python3 scripts/build-ngcc-expanded.py "$harness" "$id" --seconds 55 "${mode[@]}" \
    > "work/ngcc-wasm-rebuild/$id.attempt.log" 2>&1 || echo "Build batch timed out or crashed: $id"
  if [[ -f work/ngcc-wasm-rebuild/results.json ]]; then
    mv work/ngcc-wasm-rebuild/results.json "work/ngcc-wasm-rebuild/$id.results.json"
  fi
  echo "Finished $id"
done
