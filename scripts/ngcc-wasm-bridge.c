/* Browser bridge for the official ICCS API linked by ngcc-harness.
 * Never substitutes a different algorithm for the submitted source. */
#include <stdint.h>
#include <stddef.h>

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
#else
#error Unsupported candidate type
#endif
