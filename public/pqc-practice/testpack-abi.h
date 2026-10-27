#ifndef LIANGZAI_TESTPACK_ABI_H
#define LIANGZAI_TESTPACK_ABI_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
/* All lengths are bytes. One shared library corresponds to one exact suite.
 * The adapter must bind the actual raw encoding used by that implementation.
 * Return 0 for successful decapsulation / valid signature, nonzero otherwise.
 * Signature verification must not read more than signature_len bytes.
 * Existing ICCS adapters: scripts/ngcc-wasm-adapter.c and ngcc-wasm-bridge.c.
 */
int lab_public_bytes(void);
int lab_private_bytes(void);
int lab_output_bytes(void);
/* Required for NGCC KEM; NIST ML-KEM has a 32-byte shared secret. */
int lab_shared_bytes(void);
int lab_dec(uint8_t *shared_secret, uint8_t *ciphertext, uint8_t *private_key);
int lab_verify(uint8_t *signature, int signature_len,
               uint8_t *message, int message_len, uint8_t *public_key);
#ifdef __cplusplus
}
#endif
#endif
