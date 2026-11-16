"""Public synthetic fixtures; no KEM, signature, SSH connection or timing measurement."""
import hashlib,json,struct
S=lambda b:struct.pack('>I',len(b))+b
D=lambda b:hashlib.sha256(b).digest()
def mp(b):
 b=b.lstrip(b'\0')
 return S((b'\0'+b) if b and b[0]&128 else b)
checks={}
def check(name,value):
 checks[name]=bool(value)
 assert value,name
check('sha256_known_answer',D(b'abc').hex()=='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
check('ssh_string_known_answer',S(b'abc').hex()=='00000003616263')
check('mpint_zero',mp(bytes(32))==bytes(4))
check('mpint_high_bit',mp(b'\x80').hex()=='000000020080')
check('mpint_leading_zero',mp(b'\0\x7f').hex()=='000000017f')
pq=bytes(range(32));cl=bytes(range(128,160));K=D(pq+cl)
check('secret_order',K!=D(cl+pq))
check('fixed_width_not_mpint',K!=D(pq+mp(cl)))
check('x25519_no_reverse',int.from_bytes(cl,'big').to_bytes(32,'big')==cl and cl!=cl[::-1])
fields=[b'SSH-2.0-client',b'SSH-2.0-server',b'\x14client-kexinit',b'\x14server-kexinit',b'host-public-key-fixture',bytes(1184)+bytes(range(32)),bytes(1088)+cl,K]
H=lambda fs:D(b''.join(S(x) for x in fs))
h0=H(fields)
for i,label in enumerate(['V_C','V_S','I_C','I_S','K_S','C_INIT','S_REPLY','K']):
 mutated=fields.copy();mutated[i]=mutated[i]+b'x'
 check('transcript_'+label,H(mutated)!=h0)
check('kexinit_message_type',H(fields[:2]+[fields[2][1:]]+fields[3:])!=h0)
check('double_string',H(fields[:-1]+[S(K)])!=h0)
check('mpint_can_hide_bug',mp(K)==S(K))
boundary=b'\x80'+bytes(31)
check('key_string_not_mpint_boundary',mp(boundary)!=S(boundary))
# First 32 bytes only, not multi-block expansion.
kdf=lambda k,h,label,sid:D(S(k)+h+label+sid)
keys=[kdf(K,h0,bytes([c]),h0) for c in range(65,71)]
check('six_direction_labels',len(set(keys))==6)
f1=fields.copy();k1=D(bytes(range(1,33))+cl);f1[-1]=k1;h1=H(f1)
check('rekey_new_hash',h1!=h0)
check('rekey_fixed_session_id',kdf(k1,h1,b'C',h0)!=kdf(k1,h1,b'C',h1))
userauth=lambda sid:S(sid)+b'\x32'+S(b'alice')+S(b'ssh-connection')+S(b'publickey')+b'\x01'+S(b'ssh-ed25519')+S(b'public-key-fixture')
check('userauth_session_binding',userauth(h0)!=userauth(h1))
check('client_share_length',len(fields[5])==1216)
check('server_share_length',len(fields[6])==1120)
print(json.dumps({'experiment':'synthetic SSH serialization dependency checks; NOT protocol interoperability','passed':len(checks),'checks':checks,'vectors':{'K':K.hex(),'H_initial':h0.hex(),'H_rekey':h1.hex(),'key_C_rekey_correct':kdf(k1,h1,b'C',h0).hex(),'key_C_rekey_wrong_sid':kdf(k1,h1,b'C',h1).hex()},'limits':['No ML-KEM or X25519 computation','No signatures, network, rejection tests or performance measurement','Synthetic share lengths are not valid public keys','Only first SHA256 KDF block implemented']},indent=2))
