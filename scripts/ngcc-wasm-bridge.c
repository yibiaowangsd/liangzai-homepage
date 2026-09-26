/* Browser bridge for the official ICCS API linked by ngcc-harness.
 * Never substitutes a different algorithm for the submitted source. */
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

extern int ngcc_seed(const unsigned char *, unsigned long long);
int lab_seed(const uint8_t *seed, int len) {
  return seed && len == 48 ? ngcc_seed(seed, 48) : -1;
}

#if defined(NGCC_BUILD_HASH)
#ifndef NGCC_DIGEST_BITS
#error NGCC_DIGEST_BITS must be set to the submitted parameter
#endif
extern int CryptHash(int, const unsigned char *, unsigned long long, unsigned char *);
int lab_digest_bytes(void) { return (NGCC_DIGEST_BITS + 7) / 8; }
int lab_hash(const uint8_t *message, int bytes, uint8_t *out) {
  if (bytes < 0 || bytes > 1048576 || !out || (bytes && !message)) return -1;
  return CryptHash(NGCC_DIGEST_BITS, message, (unsigned long long)bytes * 8, out);
}

#elif defined(NGCC_BUILD_KEM)
extern unsigned long long kem_get_pk_len_bytes(void), kem_get_sk_len_bytes(void);
extern unsigned long long kem_get_ct_len_bytes(void), kem_get_ss_len_bytes(void);
extern int kem_keygen(uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
extern int kem_enc(uint8_t *, unsigned long long, uint8_t *, unsigned long long *,
                   uint8_t *, unsigned long long *);
extern int kem_dec(uint8_t *, unsigned long long, uint8_t *, unsigned long long,
                   uint8_t *, unsigned long long *);
int lab_public_bytes(void) { return (int)kem_get_pk_len_bytes(); }
int lab_private_bytes(void) { return (int)kem_get_sk_len_bytes(); }
int lab_output_bytes(void) { return (int)kem_get_ct_len_bytes(); }
int lab_shared_bytes(void) { return (int)kem_get_ss_len_bytes(); }
int lab_keypair(uint8_t *pk, uint8_t *sk) {
  unsigned long long pk_len = 0, sk_len = 0;
  int rc = kem_keygen(pk, &pk_len, sk, &sk_len);
  return rc || pk_len != kem_get_pk_len_bytes() || sk_len != kem_get_sk_len_bytes() ? -1 : 0;
}
int lab_enc(uint8_t *ct, uint8_t *ss, uint8_t *pk) {
  unsigned long long ct_len = 0, ss_len = 0;
  int rc = kem_enc(pk, kem_get_pk_len_bytes(), ss, &ss_len, ct, &ct_len);
  return rc || ct_len != kem_get_ct_len_bytes() || ss_len != kem_get_ss_len_bytes() ? -1 : 0;
}
int lab_dec(uint8_t *ss, uint8_t *ct, uint8_t *sk) {
  unsigned long long ss_len = 0;
  int rc = kem_dec(sk, kem_get_sk_len_bytes(), ct, kem_get_ct_len_bytes(), ss, &ss_len);
  return rc || ss_len != kem_get_ss_len_bytes() ? -1 : 0;
}

#elif defined(NGCC_BUILD_SIG)
extern unsigned long long sig_get_pk_len_bytes(void), sig_get_sk_len_bytes(void), sig_get_sn_len_bytes(void);
extern int sig_keygen(uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
extern int sig_sign(uint8_t *, unsigned long long, uint8_t *, unsigned long long,
                    uint8_t *, unsigned long long *);
extern int sig_verify(uint8_t *, unsigned long long, uint8_t *, unsigned long long,
                      uint8_t *, unsigned long long);
int lab_public_bytes(void) { return (int)sig_get_pk_len_bytes(); }
int lab_private_bytes(void) { return (int)sig_get_sk_len_bytes(); }
int lab_output_bytes(void) { return (int)sig_get_sn_len_bytes(); }
int lab_keypair(uint8_t *pk, uint8_t *sk) {
  unsigned long long pk_len = 0, sk_len = 0;
  int rc = sig_keygen(pk, &pk_len, sk, &sk_len);
  return rc || pk_len != sig_get_pk_len_bytes() || sk_len != sig_get_sk_len_bytes() ? -1 : 0;
}
int lab_sign(uint8_t *sig, uint8_t *message, int bytes, uint8_t *sk) {
  if (bytes < 0 || bytes > 65536) return -1;
  unsigned long long len = 0;
  int rc = sig_sign(sk, sig_get_sk_len_bytes(), message, (unsigned long long)bytes, sig, &len);
  return rc || !len || len > sig_get_sn_len_bytes() ? -1 : (int)len;
}
int lab_verify(uint8_t *sig, int len, uint8_t *message, int bytes, uint8_t *pk) {
  if (len < 1 || len > lab_output_bytes() || bytes < 0 || bytes > 65536) return -1;
  return sig_verify(pk, sig_get_pk_len_bytes(), sig, (unsigned long long)len,
                    message, (unsigned long long)bytes);
}
#elif defined(NGCC_BUILD_KEX)
/* A one-shot browser transcript, with exactly the published number of passes.
 * This runs the submitted reference functions; it does not emulate a KEM. */
#ifndef NGCC_KEX_PASSES
#error NGCC_KEX_PASSES must be the published parameter
#endif
extern unsigned long long kex_get_passes_num(void), kex_get_pk_len_bytes(void);
extern unsigned long long kex_get_sk_len_bytes(void), kex_get_sta_len_bytes(void);
extern unsigned long long kex_get_stb_len_bytes(void), kex_get_ss_len_bytes(void);
extern unsigned long long kex_get_total_msg_len_bytes(void);
extern int kex_init_a(uint8_t *, unsigned long long *, uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
extern int kex_init_b(uint8_t *, unsigned long long *, uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
extern int kex_generate_pass1_msg_a(uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
#if NGCC_KEX_PASSES >= 2
extern int kex_generate_pass2_msg_b(uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
#endif
#if NGCC_KEX_PASSES >= 3
extern int kex_generate_pass3_msg_a(uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
#endif
#if NGCC_KEX_PASSES >= 4
extern int kex_generate_pass4_msg_b(uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long *, uint8_t *, unsigned long long *);
#endif
extern int kex_derive_ss_a(uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long *);
extern int kex_derive_ss_b(uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long, uint8_t *, unsigned long long *);
int lab_passes(void) { return (int)kex_get_passes_num(); }
int lab_public_bytes(void) { return (int)kex_get_pk_len_bytes(); }
int lab_private_bytes(void) { return (int)kex_get_sk_len_bytes(); }
int lab_state_a_bytes(void) { return (int)kex_get_sta_len_bytes(); }
int lab_state_b_bytes(void) { return (int)kex_get_stb_len_bytes(); }
int lab_shared_bytes(void) { return (int)kex_get_ss_len_bytes(); }
int lab_total_bytes(void) { return (int)kex_get_total_msg_len_bytes(); }
static uint8_t *kexbuf(unsigned long long n) { return n <= 16 * 1024 * 1024 ? (uint8_t *)calloc((size_t)(n ? n : 1), 1) : NULL; }
/* One session per isolated worker. Slots expose actual reference API outputs. */
static uint8_t *session_buf[12];
static unsigned long long session_len[12], session_cap[12];
static int session_step = -1, session_derived = 0;
void lab_session_reset(void) {
  for (int i=0;i<12;i++) {
    if (session_buf[i]) { memset(session_buf[i],0,(size_t)session_cap[i]); free(session_buf[i]); }
    session_buf[i]=NULL;session_len[i]=session_cap[i]=0;
  }
  session_step=-1;session_derived=0;
}
int lab_session_start(void) {
  lab_session_reset();
  if (kex_get_passes_num()!=NGCC_KEX_PASSES || NGCC_KEX_PASSES<1 || NGCC_KEX_PASSES>4 || !kex_get_ss_len_bytes()) return -1;
  unsigned long long caps[12]={kex_get_pk_len_bytes(),kex_get_sk_len_bytes(),kex_get_sta_len_bytes(),
    kex_get_pk_len_bytes(),kex_get_sk_len_bytes(),kex_get_stb_len_bytes(),
    kex_get_total_msg_len_bytes(),kex_get_total_msg_len_bytes(),kex_get_total_msg_len_bytes(),kex_get_total_msg_len_bytes(),
    kex_get_ss_len_bytes(),kex_get_ss_len_bytes()};
  for(int i=0;i<12;i++) {
    session_cap[i]=caps[i];session_buf[i]=kexbuf(caps[i]);
    if(!session_buf[i]){lab_session_reset();return -1;}
    session_len[i]=i<6?caps[i]:0;
  }
  if(kex_init_a(session_buf[0],&session_len[0],session_buf[1],&session_len[1],session_buf[2],&session_len[2])<0 ||
     kex_init_b(session_buf[3],&session_len[3],session_buf[4],&session_len[4],session_buf[5],&session_len[5])<0) {
    lab_session_reset();return -1;
  }
  for(int i=0;i<6;i++)if(session_len[i]>session_cap[i]){lab_session_reset();return -1;}
  session_step=0;return 0;
}
int lab_session_pass(int pass) {
  if(session_step<0 || pass!=session_step+1 || pass>NGCC_KEX_PASSES)return -1;
  int rc=-1, slot=5+pass, state=pass%2?2:5;
  if(pass==1)rc=kex_generate_pass1_msg_a(session_buf[1],session_len[1],session_buf[3],session_len[3],session_buf[2],&session_len[2],session_buf[6],&session_len[6]);
#if NGCC_KEX_PASSES >= 2
  if(pass==2)rc=kex_generate_pass2_msg_b(session_buf[4],session_len[4],session_buf[0],session_len[0],session_buf[6],session_len[6],session_buf[5],&session_len[5],session_buf[7],&session_len[7]);
#endif
#if NGCC_KEX_PASSES >= 3
  if(pass==3)rc=kex_generate_pass3_msg_a(session_buf[1],session_len[1],session_buf[3],session_len[3],session_buf[7],session_len[7],session_buf[2],&session_len[2],session_buf[8],&session_len[8]);
#endif
#if NGCC_KEX_PASSES >= 4
  if(pass==4)rc=kex_generate_pass4_msg_b(session_buf[4],session_len[4],session_buf[0],session_len[0],session_buf[8],session_len[8],session_buf[5],&session_len[5],session_buf[9],&session_len[9]);
#endif
  if(rc<0 || session_len[slot]>session_cap[slot] || session_len[state]>session_cap[state]){lab_session_reset();return -1;}
  session_step=pass;return 0;
}
int lab_session_derive(int side) {
  if(session_step!=NGCC_KEX_PASSES || side<0 || side>1 || (session_derived&(1<<side)))return -1;
  const int own=side?3:0,peer=side?0:3,out=10+side;
  const int pass=side?(NGCC_KEX_PASSES%2?NGCC_KEX_PASSES:NGCC_KEX_PASSES-1):(NGCC_KEX_PASSES%2?NGCC_KEX_PASSES-1:NGCC_KEX_PASSES);
  session_len[out]=session_cap[out];
  int (*derive)(uint8_t*,unsigned long long,uint8_t*,unsigned long long,uint8_t*,unsigned long long,uint8_t*,unsigned long long,uint8_t*,unsigned long long*)=side?kex_derive_ss_b:kex_derive_ss_a;
  int rc=derive(session_buf[own+1],session_len[own+1],session_buf[peer],session_len[peer],pass?session_buf[5+pass]:NULL,pass?session_len[5+pass]:0,session_buf[own+2],session_len[own+2],session_buf[out],&session_len[out]);
  if(rc<0 || session_len[out]!=session_cap[out]){lab_session_reset();return -1;}
  session_derived|=1<<side;return 0;
}
uint8_t *lab_session_data(int slot) {return session_step>=0&&slot>=0&&slot<12?session_buf[slot]:NULL;}
int lab_session_bytes(int slot) {return session_step>=0&&slot>=0&&slot<12?(int)session_len[slot]:-1;}
int lab_session_match(void) {return session_derived==3&&session_len[10]==session_len[11]&&!memcmp(session_buf[10],session_buf[11],session_len[10]);}
int lab_exchange(uint8_t *output) {
  if(!output || lab_session_start())return -1;
  int ok=-1;
  for(int pass=1;pass<=NGCC_KEX_PASSES;pass++)if(lab_session_pass(pass))goto done;
  if(lab_session_derive(0)||lab_session_derive(1)||!lab_session_match())goto done;
  memcpy(output,session_buf[10],session_len[10]);ok=0;
done: lab_session_reset();return ok;
}

#else
#error Unsupported candidate type
#endif
