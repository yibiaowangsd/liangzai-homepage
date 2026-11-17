"""Offline synthetic TLS-shaped bodies, NOT X.509/ML-DSA or TLS handshakes."""
import hashlib,json,zlib

def u24(n): return n.to_bytes(3,'big')
def body(cert,context=b'',ext=b''):
    entry=u24(len(cert))+cert+len(ext).to_bytes(2,'big')+ext
    return bytes([len(context)])+context+u24(len(entry))+entry

def bounded(data,declared,cap=65536):
    if declared>cap: raise ValueError('policy_limit')
    d=zlib.decompressobj()
    out=d.decompress(data,declared+1)
    if len(out)>declared: raise ValueError('output_limit')
    if not d.eof: raise ValueError('incomplete_or_limit')
    if d.unused_data: raise ValueError('trailing_data')
    if len(out)!=declared: raise ValueError('length_mismatch')
    return out

def reject(data,n,cap=65536):
    try: bounded(data,n,cap); return False
    except (ValueError,zlib.error): return True

def main():
    checks={}; samples=[]
    noise=hashlib.shake_256(b'public deterministic synthetic bytes v1').digest(8192)
    inputs={'repeated-8192':b'A'*8192,'mixed-8192':b'Issuer=Example;Subject=Example;'*64+noise[:6208],'hash-derived-8192':noise}
    for name,raw in inputs.items():
        b=body(raw); c=zlib.compress(b,9)
        checks[name+'-roundtrip']=bounded(c,len(b))==b
        checks[name+'-frame-delta']=(12+len(c))-(4+len(b))==len(c)+8-len(b)
        samples.append({'name':name,'body_bytes':len(b),'compressed_bytes':len(c),'plain_handshake_bytes':4+len(b),'compressed_handshake_bytes':12+len(c),'net_saved_bytes':len(b)-len(c)-8})
    b=body(noise); c=zlib.compress(b,9)
    checks['declared-short']=reject(c,len(b)-1)
    checks['declared-long']=reject(c,len(b)+1)
    checks['local-cap']=reject(c,len(b),len(b)-1)
    checks['truncated']=reject(c[:-1],len(b))
    checks['corrupt']=reject(b'not-zlib',len(b))
    checks['trailing-data']=reject(c+b'x',len(b))
    checks['compression-bomb-bound']=reject(zlib.compress(b'X'*1000000),100)
    checks['client-context-changes-body']=body(noise,b'A')!=body(noise,b'B')
    checks['extension-changes-body']=body(noise,ext=b'old')!=body(noise,ext=b'new')
    checks['chain-content-changes-cache-key']=hashlib.sha256(body(noise)).digest()!=hashlib.sha256(body(noise[:-1]+b'Z')).digest()
    assert all(checks.values()),checks
    return {'kind':'offline synthetic byte experiment; not certificate or handshake benchmark','zlib_runtime':zlib.ZLIB_RUNTIME_VERSION,'passed':len(checks),'checks':checks,'samples':samples}
if __name__=='__main__': print(json.dumps(main(),indent=2))
