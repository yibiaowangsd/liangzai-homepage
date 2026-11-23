import hashlib, json, re, socket, subprocess as sp, tempfile, time
from pathlib import Path
def cli(*args, **kw):
    return sp.run(["openssl", *args], text=True, capture_output=True, **kw)
version = cli("version", check=True).stdout.strip()
def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()
with tempfile.TemporaryDirectory() as tmp:
    crt, key = f"{tmp}/crt.pem", f"{tmp}/key.pem"
    r=cli("req","-x509","-newkey","ec","-pkeyopt","ec_paramgen_curve:P-256","-noenc","-subj","/CN=synthetic.local","-addext","subjectAltName=DNS:synthetic.local","-days","2","-keyout",key,"-out",crt,check=True)
    # Reserve a loopback address only; no real network targets.
    with socket.socket() as s:
        s.bind(("127.0.0.1",0)); port=s.getsockname()[1]
    report = {"implementation":version,"host":"loopback only","cert_pem_sha256":sha(crt),"attempts":[]}
    for epoch, group in enumerate(("X25519","X25519MLKEM768","X25519"),start=1):
        with sp.Popen(["openssl","s_server","-4","-accept",f"127.0.0.1:{port}","-www","-naccept","1","-tls1_3","-cert",crt,"-key",key,"-ciphersuites","TLS_AES_128_GCM_SHA256","-groups",group,"-no_ticket"],stdout=sp.PIPE,stderr=sp.PIPE,text=True) as srv:
            try:
                time.sleep(.16)
                if srv.poll() is not None:
                    raise RuntimeError("server bind/start failed: "+srv.communicate()[1])
                p=cli("s_client","-4","-connect",f"127.0.0.1:{port}","-tls1_3","-servername","synthetic.local","-verify_hostname","synthetic.local","-verify_return_error","-CAfile",crt,"-groups","X25519MLKEM768:X25519","-ciphersuites","TLS_AES_128_GCM_SHA256","-brief","-trace","-ign_eof",input="GET / HTTP/1.0\r\nHost: synthetic.local\r\n\r\n",timeout=4)
                lines=p.stdout.splitlines()+p.stderr.splitlines()
                text = p.stdout
                server_hellos = re.findall(r"^    ServerHello,.*?(?=^\S|\Z)", text, re.S | re.M)
                final_sh = server_hellos[-1]
                chosen = re.findall(r"extension_type=key_share[^\n]*\n\s+NamedGroup: ([^ (]+)", final_sh)
                auth = re.findall(r"^    CertificateVerify,[^\n]*\n\s+Signature Algorithm: ([^ (]+)",text,re.M)
                assert p.returncode == 0 and "HTTP/1.0 200 ok" in text, p.stderr
                assert "Verification: OK" in p.stderr, p.stderr
                assert chosen == [{"X25519":"ecdh_x25519","X25519MLKEM768":"X25519MLKEM768"}[group]], chosen
                assert auth == ["ecdsa_secp256r1_sha256"], auth
                assert "Protocol version: TLSv1.3" in p.stderr and "Ciphersuite: TLS_AES_128_GCM_SHA256" in p.stderr
                report["attempts"].append({"config_epoch":epoch,"configured_group":group,"negotiated_group":group,"certificate_verify":auth[0],"tls":"TLSv1.3","cipher":"TLS_AES_128_GCM_SHA256","server_hello_count_including_hrr":len(server_hellos),"verified_hostname_and_trust":True,"completed_http_response":True})
                assert srv.wait(timeout=4)==0
            finally:
                if srv.poll() is None: srv.terminate()
    print(json.dumps(report,indent=2))
