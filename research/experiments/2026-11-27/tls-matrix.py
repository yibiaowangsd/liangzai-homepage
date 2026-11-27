import os, pathlib, socket, subprocess, tempfile, time
from contextlib import contextmanager

root = pathlib.Path(__file__).resolve().parent
build = root / 'openssl-3.5.9'
cli = build / 'apps' / 'openssl'
base = dict(os.environ, LD_LIBRARY_PATH=str(build), OPENSSL_MODULES=str(build/'providers'), OPENSSL_CONF='/dev/null')
envs = {'default':base, 'fips':dict(base, OPENSSL_CONF=str(root/'lab-fips.cnf'))}
def run(args, **kw):
    return subprocess.run([cli,*args], text=True, capture_output=True, timeout=8, **kw)

with tempfile.TemporaryDirectory() as d:
    p = pathlib.Path(d)
    cert, key = str(p/'cert.pem'),str(p/'key.pem')
    # One ephemeral, explicitly trusted localhost ECDSA host cert; no production credentials.
    r=run(['req','-new','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-sha256','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-addext','basicConstraints=critical,CA:FALSE','-addext','keyUsage=critical,digitalSignature','-addext','extendedKeyUsage=serverAuth','-keyout',key,'-out',cert],env=envs['fips'])
    assert r.returncode==0,r.stderr
    for mode, env in envs.items():
        print(mode, run(['list','-providers'],env=env).stdout.strip().replace('\n',' / '))
        for group in ['P-256','X25519','X25519MLKEM768','SecP256r1MLKEM768']:
            with socket.socket() as s:
                s.bind(('127.0.0.1',0))
                port = s.getsockname()[1]
            endpoint=f'127.0.0.1:{port}'
            server = subprocess.Popen([cli,'s_server','-accept',endpoint,'-cert',cert,'-key',key,'-tls1_3','-groups',group,'-www','-naccept','1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env)
            try:
                time.sleep(.3)
                client = run(['s_client','-connect',endpoint,'-tls1_3','-groups',group,'-brief','-ign_eof','-CAfile',cert,'-verify_hostname','localhost','-verify_return_error','-servername','localhost'],env=env,input='GET / HTTP/1.0\r\n\r\n')
                if client.returncode != 0 and server.poll() is None: server.terminate()
                so,se=server.communicate(timeout=8)
                lines=[v for v in client.stderr.splitlines() if any(t in v for t in ('Peer Temp Key','group','Signature','Verification','version','Error','error'))]
                http='HTTP/1.0 200 ok' in client.stdout
                print(mode,group,'client_rc',client.returncode,'server_rc',server.returncode,'http200',http,'|','; '.join(lines),'|',se.strip().replace('\n','; '))
                if mode=='fips' and group=='X25519':
                    assert client.returncode and server.returncode and not http and ('SSL_CONF_cmd(-groups, X25519) failed' in client.stderr and 'SSL_CONF_cmd(-groups, X25519) failed' in se)
                else:
                    assert client.returncode==0 and server.returncode==0 and http and 'Verification: OK' in client.stderr and ( {'P-256':'Peer Temp Key: ECDH, prime256v1','X25519':'Peer Temp Key: X25519'}.get(group, 'Negotiated TLS1.3 group: ' + group) in client.stderr),client.stderr
            finally:
                if server.poll() is None: server.kill();server.wait()
