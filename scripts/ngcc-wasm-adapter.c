#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include "drng.h"

#if defined(NGCC_KEM)
#if defined(NGCC_KEM_HEADER)
#include NGCC_KEM_HEADER
#else
#include "KEM_AlgorithmInstance.h"
#endif
#elif defined(NGCC_SIG)
#include "SIG_AlgorithmInstance.h"
#else
#error Select the candidate API
#endif

/* Each operation receives a fresh 48-byte seed drawn by the browser from
 * Web Crypto.  The reference implementations use the ICCS DRNG context. */
DRNG_ctx drng_algorithm;
#if defined(NGCC_SIG) || defined(NGCC_WASM_RANDOMBYTES)
/* The submitted signature header declares size_t, while its rng.c defines
 * unsigned long long. These differ on wasm32 and cause a signature trap. */
void randombytes(unsigned char *out, size_t length) {
  if (get_random_number(&drng_algorithm, out, (unsigned long long)length * 8) != 0)
    abort();
}
#endif
int lab_seed(const uint8_t *seed, int length) {
  if (!seed || length != 48) return -1;
  return init_random_number(&drng_algorithm, seed, (unsigned long long)length);
}

int lab_public_bytes(void) {
#if defined(NGCC_KEM)
  return (int)kem_get_pk_len_bytes();
#else
  return (int)sig_get_pk_len_bytes();
#endif
}
int lab_private_bytes(void) {
#if defined(NGCC_KEM)
  return (int)kem_get_sk_len_bytes();
#else
  return (int)sig_get_sk_len_bytes();
#endif
}
int lab_output_bytes(void) {
#if defined(NGCC_KEM)
  return (int)kem_get_ct_len_bytes();
#else
  return (int)sig_get_sn_len_bytes();
#endif
}

int lab_keypair(uint8_t *pk, uint8_t *sk) {
  unsigned long long pk_len = 0, sk_len = 0;
#if defined(NGCC_KEM)
  int status = kem_keygen(pk, &pk_len, sk, &sk_len);
#else
  int status = sig_keygen(pk, &pk_len, sk, &sk_len);
#endif
  return status == 0 && pk_len == (unsigned)lab_public_bytes()
    && sk_len == (unsigned)lab_private_bytes() ? 0 : -1;
}

#if defined(NGCC_KEM)
int lab_shared_bytes(void) { return (int)kem_get_ss_len_bytes(); }
int lab_enc(uint8_t *ct, uint8_t *ss, uint8_t *pk) {
  unsigned long long ss_len = 0, ct_len = 0;
  int status = kem_enc(pk, kem_get_pk_len_bytes(), ss, &ss_len, ct, &ct_len);
  return status == 0 && ss_len == kem_get_ss_len_bytes()
    && ct_len == kem_get_ct_len_bytes() ? 0 : -1;
}
int lab_dec(uint8_t *ss, uint8_t *ct, uint8_t *sk) {
  unsigned long long ss_len = 0;
  int status = kem_dec(sk, kem_get_sk_len_bytes(), ct, kem_get_ct_len_bytes(), ss, &ss_len);
  return status == 0 && ss_len == kem_get_ss_len_bytes() ? 0 : -1;
}
#else
int lab_sign(uint8_t *sn, uint8_t *message, int message_len, uint8_t *sk) {
  if (message_len < 0 || message_len > 65536) return -1;
  unsigned long long sn_len = 0;
  int status = sig_sign(sk, sig_get_sk_len_bytes(), message,
                        (unsigned long long)message_len, sn, &sn_len);
  return status == 0 && sn_len > 0 && sn_len <= sig_get_sn_len_bytes() ? (int)sn_len : -1;
}
int lab_verify(uint8_t *sn, int sn_len, uint8_t *message, int message_len, uint8_t *pk) {
  if (sn_len <= 0 || sn_len > lab_output_bytes() || message_len < 0 || message_len > 65536) return -1;
  return sig_verify(pk, sig_get_pk_len_bytes(), sn, (unsigned long long)sn_len,
                    message, (unsigned long long)message_len);
}
#endif
