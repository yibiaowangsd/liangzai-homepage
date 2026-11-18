#!/usr/bin/env python3
"""Local OpenSSL CLI functional checks; not timing, ACVP or protocol tests.
Generated keys and secrets exist only in a temporary directory, never in report.
"""
import json, subprocess, tempfile, pathlib, platform

def run(*args):
    return subprocess.run(['openssl', *args], capture_output=True)

def main():
    results=[]
    with tempfile.TemporaryDirectory() as tmp:
        p=pathlib.Path(tmp)
        for level,clen in [(512,768),(768,1088),(1024,1568)]:
            d=p/str(level); d.mkdir()
            sk=d/'key.pem'; pk=d/'pub.pem'; ct=d/'ct'; ss=d/'ss'
            def check(name,ok):
                results.append({'parameter':level,'check':name,'pass':bool(ok)})
                if not ok: raise AssertionError(results[-1])
            for cmd in [('genpkey','-algorithm',f'ML-KEM-{level}','-out',str(sk)),('pkey','-in',str(sk),'-pubout','-out',str(pk)),('pkeyutl','-encap','-pubin','-inkey',str(pk),'-out',str(ct),'-secret',str(ss))]:
                r=run(*cmd)
                if r.returncode: raise RuntimeError(r.stderr.decode())
            original=ct.read_bytes(); secret=ss.read_bytes()
            check('ciphertext-and-secret-length',len(original)==clen and len(secret)==32)
            def dec(name,data,key=sk):
                inp=d/(name+'.ct'); out=d/(name+'.ss'); inp.write_bytes(data)
                r=run('pkeyutl','-decap','-inkey',str(key),'-in',str(inp),'-out',str(out))
                return r.returncode, out.read_bytes() if out.exists() else b''
            rc,k=dec('honest',original);check('honest-roundtrip',rc==0 and k==secret)
            bad=bytes([original[0]^1])+original[1:]
            rc,k=dec('mutated',bad);check('same-length-mutation-returns-32-bytes',rc==0 and len(k)==32)
            check('mutation-differs-from-original-secret',k!=secret)
            rc,k2=dec('repeat',bad);check('same-key-and-ciphertext-repeat-stable',rc==0 and k2==k)
            rc,k=dec('short',original[:-1]);check('short-ciphertext-explicit-error',rc!=0)
            rc,k=dec('long',original+b'\0');check('long-ciphertext-explicit-error',rc!=0)
            sk2=d/'other.pem';r=run('genpkey','-algorithm',f'ML-KEM-{level}','-out',str(sk2))
            if r.returncode: raise RuntimeError(r.stderr.decode())
            rc,k=dec('other-key',original,sk2);check('different-key-returns-different-secret',rc==0 and len(k)==32 and k!=secret)
    report={'scope':'Actual local OpenSSL CLI ML-KEM tests, random fresh keys; no protocol/side-channel/ACVP certification or performance measurement', 'openssl':run('version','-a').stdout.decode().strip(),'platform':platform.platform(),'checks':results,'passed':sum(x['pass'] for x in results),'total':len(results)}
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
