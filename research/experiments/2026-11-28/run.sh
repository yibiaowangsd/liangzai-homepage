#!/usr/bin/env bash
set -euo pipefail
out=$(pwd)
tmp=$(mktemp -d)
pid=''
cleanup() { if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || :; wait "$pid" 2>/dev/null || :; fi; rm -rf -- "$tmp"; }
trap cleanup EXIT
cd "$tmp"
openssl version > "$out/results.txt"
openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -noenc -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost' -keyout key.pem -out cert.pem -days 1 >/dev/null 2>&1
start() {
 if [[ -n "$pid" ]]; then kill "$pid"; wait "$pid" 2>/dev/null || :; fi
 port=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')
 openssl s_server -accept "127.0.0.1:$port" -tls1_3 -cert cert.pem -key key.pem -www -groups "$1" -ciphersuites TLS_AES_256_GCM_SHA384 >server.log 2>&1 &
 pid=$!
 for _ in {1..100}; do grep -q '^ACCEPT' server.log && return; kill -0 "$pid"; sleep .02; done
 return 1
}
run() {
 name=$1; group=$2; shift 2
 printf 'GET / HTTP/1.0\r\nHost: localhost\r\n\r\n' | timeout 7 openssl s_client -connect "127.0.0.1:$port" -servername localhost -verify_hostname localhost -verify_return_error -CAfile cert.pem -tls1_3 -ign_eof -groups "$group" -ciphersuites TLS_AES_256_GCM_SHA384 -trace "$@" >"$name.log" 2>&1
}
start X25519:X25519MLKEM768
run issue-classical X25519 -sess_out old.pem
run full-hybrid X25519MLKEM768
run resume-classical X25519 -sess_in old.pem
run resume-hybrid X25519MLKEM768 -sess_in old.pem
start X25519MLKEM768
run post-cutover X25519MLKEM768 -sess_in old.pem -sess_out new.pem
run resume-new X25519MLKEM768 -sess_in new.pem
python3 - <<'PY' | tee -a "$out/results.txt"
from pathlib import Path
import re
print("case | final group | psk offered | selected PSK index | fresh CertificateVerify | HTTP")
for name,group,offer,selected in [
    ('issue-classical','ecdh_x25519',False,False),
    ('full-hybrid','X25519MLKEM768',False,False),
    ('resume-classical','ecdh_x25519',True,True),
    ('resume-hybrid','X25519MLKEM768',True,True),
    ('post-cutover','X25519MLKEM768',True,False),
    ('resume-new','X25519MLKEM768',True,True),
]:
    trace=Path(name+'.log').read_text()
    ch,sh=trace.split('    ServerHello, Length=',1)
    sh=re.split(r'\n(?:Received|Sent) TLS Record',sh)[0]
    assert re.search(r'NamedGroup: '+group+r' \(',sh)
    assert ('extension_type=psk(41)' in ch)==offer
    assert ('extension_type=psk(41)' in sh)==selected
    assert re.search(r'extension_type=psk\(41\), length=2\s*0000 - 00 00',sh) if selected else True
    assert (('Reused' if selected else 'New')+', TLSv1.3' in trace)
    assert ('CertificateVerify' in trace)==(not selected)
    assert 'Verification: OK' in trace and 'HTTP/1.0 200 ok' in trace
    print(f'{name} | {group} | {offer} | {0 if selected else "none"} | {not selected} | 200')
PY
