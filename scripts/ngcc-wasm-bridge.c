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
int lab_exchange(uint8_t *output) {
  const unsigned long long pk = kex_get_pk_len_bytes(), sk = kex_get_sk_len_bytes();
  const unsigned long long sa = kex_get_sta_len_bytes(), sb = kex_get_stb_len_bytes();
  const unsigned long long ss = kex_get_ss_len_bytes(), total = kex_get_total_msg_len_bytes();
  if (!output || kex_get_passes_num() != NGCC_KEX_PASSES || NGCC_KEX_PASSES > 4 || !ss) return -1;
  uint8_t *pka = kexbuf(pk), *ska = kexbuf(sk), *pkb = kexbuf(pk), *skb = kexbuf(sk);
  uint8_t *sta = kexbuf(sa), *stb = kexbuf(sb), *ssa = kexbuf(ss), *ssb = kexbuf(ss);
  uint8_t *msg[5] = { NULL, kexbuf(total), kexbuf(total), kexbuf(total), kexbuf(total) };
  unsigned long long alen = sa, blen = sb, pka_len = pk, ska_len = sk, pkb_len = pk, skb_len = sk;
  unsigned long long mlen[5] = {0}, ssa_len = ss, ssb_len = ss;
  uint8_t *ma = NULL, *mb = NULL;
  unsigned long long ma_len = 0, mb_len = 0;
  int ok = -1, rc;
  if (!pka || !ska || !pkb || !skb || !sta || !stb || !ssa || !ssb || !msg[1] || !msg[2] || !msg[3] || !msg[4]) goto done;
  if (kex_init_a(pka, &pka_len, ska, &ska_len, sta, &alen) < 0 ||
      kex_init_b(pkb, &pkb_len, skb, &skb_len, stb, &blen) < 0 ||
      pka_len > pk || ska_len > sk || pkb_len > pk || skb_len > sk || alen > sa || blen > sb) goto done;
  rc = kex_generate_pass1_msg_a(ska, ska_len, pkb, pkb_len, sta, &alen, msg[1], &mlen[1]);
  if (rc < 0 || alen > sa || mlen[1] > total) goto done;
  ma = msg[1]; ma_len = mlen[1];
#if NGCC_KEX_PASSES >= 2
  rc = kex_generate_pass2_msg_b(skb, skb_len, pka, pka_len, msg[1], mlen[1], stb, &blen, msg[2], &mlen[2]);
  if (rc < 0 || blen > sb || mlen[2] > total) goto done;
  mb = msg[2]; mb_len = mlen[2];
#endif
#if NGCC_KEX_PASSES >= 3
  rc = kex_generate_pass3_msg_a(ska, ska_len, pkb, pkb_len, msg[2], mlen[2], sta, &alen, msg[3], &mlen[3]);
  if (rc < 0 || alen > sa || mlen[3] > total) goto done;
  ma = msg[3]; ma_len = mlen[3];
#endif
#if NGCC_KEX_PASSES >= 4
  rc = kex_generate_pass4_msg_b(skb, skb_len, pka, pka_len, msg[3], mlen[3], stb, &blen, msg[4], &mlen[4]);
  if (rc < 0 || blen > sb || mlen[4] > total) goto done;
  mb = msg[4]; mb_len = mlen[4];
#endif
  if (kex_derive_ss_a(ska, ska_len, pkb, pkb_len, mb, mb_len, sta, alen, ssa, &ssa_len) < 0 ||
      kex_derive_ss_b(skb, skb_len, pka, pka_len, ma, ma_len, stb, blen, ssb, &ssb_len) < 0 ||
      ssa_len != ss || ssb_len != ss || memcmp(ssa, ssb, ss)) goto done;
  memcpy(output, ssa, ss);
  ok = 0;
done:
  free(pka); free(ska); free(pkb); free(skb); free(sta); free(stb);
  free(ssa); free(ssb);
  for (int i = 1; i <= 4; i++) free(msg[i]);
  return ok;
}
#else
#error Unsupported candidate type
#endif
