#!/usr/bin/env bash
set -euo pipefail

command -v emcc >/dev/null || { echo 'Activate Emscripten first' >&2; exit 1; }
ngcc_root="${1:?Pass the path to the ngcc-harness checkout}"
cd "$(dirname "$0")/.."
mkdir -p public/pqc-practice/wasm

common=(-O2 -std=c99 -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node
  -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=1 -sNO_EXIT_RUNTIME=1 -sSTACK_SIZE=16777216
  -sEXPORTED_RUNTIME_METHODS=HEAPU8 -sINCOMING_MODULE_JS_API="['locateFile','wasmBinary']"
  -Wno-deprecated-non-prototype)
if [[ "${NGCC_DEBUG:-0}" == 1 ]]; then
  common+=(-g3 -sASSERTIONS=2 -sSAFE_HEAP=1 -sSTACK_OVERFLOW_CHECK=2)
fi
kem_exports="['_malloc','_free','_lab_seed','_lab_public_bytes','_lab_private_bytes','_lab_output_bytes','_lab_shared_bytes','_lab_keypair','_lab_enc','_lab_dec']"
sig_exports="['_malloc','_free','_lab_seed','_lab_public_bytes','_lab_private_bytes','_lab_output_bytes','_lab_keypair','_lab_sign','_lab_verify']"
adapter=scripts/ngcc-wasm-adapter.c

build_kem() {
  local num="$1" dir="$ngcc_root/kem-01/Implementations/Reference_Implementation/Aigis-Enc+-$2"
  local patched
  patched="$(mktemp -d)"
  python3 scripts/patch-ngcc-aigis-kem.py "$dir" "$patched"
  local sources=(cbd fips202 poly reduce precomp ntt polyvec owcpa kem verify hashkdf gen_a pack)
  local inputs=()
  for part in "${sources[@]}"; do
    if [[ -f "$patched/$part.c" ]]; then inputs+=("$patched/$part.c");
    else inputs+=("$dir/$part.c"); fi
  done
  inputs+=("$dir/kat_test/auxfunc.c" "$dir/kat_test/KEM_AlgorithmInstance.c"
    "$dir/kat_test/drng.c" "$dir/kat_test/rng.c")
  echo "Compiling official Aigis-Enc+ instance $num"
  emcc "${common[@]}" -DNGCC_KEM -DPARAMS="$num" -DUSE_NICCS_API -I"$dir" -I"$dir/kat_test" \
    "$adapter" "${inputs[@]}" -sEXPORTED_FUNCTIONS="$kem_exports" \
    -o "public/pqc-practice/wasm/ngcc-kem-01-$((num-1)).mjs"
  rm -r "$patched"
}

build_sig() {
  local num="$1" dir="$ngcc_root/sign-01/Implementations/Implementations/Reference_Implementation/Aigis-Sig+-$2"
  local patched
  patched="$(mktemp -d)"
  python3 scripts/patch-ngcc-aigis-sig.py "$dir" "$patched"
  local sources=(sign polyvec packing poly reduce ntt rounding fips202 hashkdf
    auxfunc SIG_AlgorithmInstance drng pspm)
  local inputs=()
  for part in "${sources[@]}"; do
    if [[ -f "$patched/$part.c" ]]; then inputs+=("$patched/$part.c");
    else inputs+=("$dir/$part.c"); fi
  done
  echo "Compiling official Aigis-Sig+ instance $num"
  # The submitted pspm.c relies on C pointer conversions accepted by GCC.
  # Clang 24 diagnoses them as errors; preserve the submitted source unchanged.
  emcc "${common[@]}" -fno-strict-aliasing -Wno-incompatible-pointer-types \
    -Wno-incompatible-pointer-types-discards-qualifiers \
    -DNGCC_SIG -DPARAMS="$num" -DUSE_ICCS -I"$dir" \
    "$adapter" "${inputs[@]}" -sEXPORTED_FUNCTIONS="$sig_exports" \
    -o "public/pqc-practice/wasm/ngcc-sign-01-$((num-1)).mjs"
  rm -r "$patched"
}

build_ntre() {
  local num="$1" level="$2"
  local dir="$ngcc_root/kem-27/Implementations/Reference_Implementation/NTRE-$level"
  echo "Compiling official NTRE-$level"
  emcc "${common[@]}" -DNGCC_KEM -I"$dir" -I"$dir/src" "$adapter" \
    "$dir/src/poly.c" "$dir/src/ntt.c" "$dir/src/symmetric.c" \
    "$dir/KEM_AlgorithmInstance.c" "$dir/auxfunc.c" "$dir/drng.c" \
    -sEXPORTED_FUNCTIONS="$kem_exports" \
    -o "public/pqc-practice/wasm/ngcc-kem-27-$num.mjs"
}

build_bw() {
  local num="$1" level="$2"
  local dir="$ngcc_root/kem-08/Implementations/Reference_Implementation/BW_KEM_C$level"
  local sources=(BWcoding polyvec poly reduce ntt cbd indcpa kem verify
    symmetric-iccs KEM_AlgorithmInstance auxfunc drng)
  local inputs=()
  for part in "${sources[@]}"; do inputs+=("$dir/$part.c"); done
  local defines=()
  if [[ "$level" == 128 ]]; then defines+=(-DBWKEM128_INTERNAL_COMPAT -DBWKEM128_USE_ICCS_AUXFUNC);
  else defines+=(-DBWKEM_C${level}_USE_ICCS_AUXFUNC); fi
  echo "Compiling official BW-KEM-C$level"
  emcc "${common[@]}" -DNGCC_KEM -DNGCC_WASM_RANDOMBYTES "${defines[@]}" -I"$dir" "$adapter" "${inputs[@]}" \
    -sEXPORTED_FUNCTIONS="$kem_exports" \
    -o "public/pqc-practice/wasm/ngcc-kem-08-$num.mjs"
}

build_weaver() {
  local num="$1" level="$2" mode="$3"
  local dir="$ngcc_root/kem-39/Implementations/Reference_Implementation/WeaverKEM-$level"
  local sources=(drng auxfunc symmetric-iccs kem_cca indcpa polyvec poly ntt cbd
    reduce verify msgenc bch_high bch_low poly_invq "KEM_WeaverKEM-$level")
  local inputs=()
  for part in "${sources[@]}"; do inputs+=("$dir/$part.c"); done
  echo "Compiling official WeaverKEM-$level"
  emcc "${common[@]}" -DNGCC_KEM "-DNGCC_KEM_HEADER=\"KEM_WeaverKEM-$level.h\"" \
    -DWEAVER_MODE="$mode" -I"$dir" "$adapter" "${inputs[@]}" \
    -sEXPORTED_FUNCTIONS="$kem_exports" \
    -o "public/pqc-practice/wasm/ngcc-kem-39-$num.mjs"
}

case "${NGCC_INSTANCE:-all}" in
  kem-01-0) build_kem 1 I ;;
  kem-27-0) build_ntre 0 128 ;;
  kem-27-1) build_ntre 1 256 ;;
  kem-27-2) build_ntre 2 512 ;;
  kem-08-0) build_bw 0 128 ;;
  kem-08-1) build_bw 1 256 ;;
  kem-08-2) build_bw 2 512 ;;
  kem-39-0) build_weaver 0 128 1 ;;
  kem-39-1) build_weaver 1 256 3 ;;
  kem-39-2) build_weaver 2 512 5 ;;
  sign-01-0) build_sig 1 I ;;
  all)
    build_kem 1 I
    build_kem 2 II
    build_kem 3 III
    build_sig 1 I
    build_sig 2 II
    build_sig 3 III
    build_ntre 0 128
    build_ntre 1 256
    build_ntre 2 512
    build_bw 0 128
    build_bw 1 256
    build_bw 2 512
    build_weaver 0 128 1
    build_weaver 1 256 3
    build_weaver 2 512 5 ;;
  *) echo "Unknown instance: ${NGCC_INSTANCE}" >&2; exit 2 ;;
esac
