#include <stdio.h>
#include <string.h>
#include <openssl/evp.h>
#include <openssl/core_names.h>
#include <openssl/provider.h>
#include <openssl/crypto.h>
#include <openssl/err.h>

static int indicator(EVP_PKEY_CTX *ctx) {
    int n = -99;
    OSSL_PARAM p[] = { OSSL_PARAM_construct_int(OSSL_KEM_PARAM_FIPS_APPROVED_INDICATOR, &n), OSSL_PARAM_construct_end() };
    int rc = EVP_PKEY_CTX_get_params(ctx, p);
    printf(" %s:query=%d,value=%d", OSSL_PROVIDER_get0_name(EVP_PKEY_CTX_get0_provider(ctx)), rc, n);
    return n;
}
static int trial(const char *alg, int strict) {
    EVP_PKEY *k = EVP_PKEY_Q_keygen(NULL, NULL, alg);
    EVP_PKEY_CTX *e = k ? EVP_PKEY_CTX_new_from_pkey(NULL,k,NULL) : NULL;
    EVP_PKEY_CTX *d = k ? EVP_PKEY_CTX_new_from_pkey(NULL,k,NULL) : NULL;
    unsigned char a[256] = {0}, b[256] = {0}, ct[2048];
    size_t na=sizeof(a), nb=sizeof(b), nc=sizeof(ct);
    int ok = 0;
    printf("%s", alg);
    if (e && d && EVP_PKEY_encapsulate_init(e,NULL)>0 && EVP_PKEY_encapsulate(e,ct,&nc,a,&na)>0
        && EVP_PKEY_decapsulate_init(d,NULL)>0 && EVP_PKEY_decapsulate(d,b,&nb,ct,nc)>0) {
        int ei=indicator(e), di=indicator(d);
        ok = na==nb && CRYPTO_memcmp(a,b,na)==0;
        printf(" ciphertext_bytes=%zu secret_bytes=%zu match=%d",nc,na,ok);
        if(strict && (ei!=1 || di!=1)) ok=0;
    }
    puts("");
    if(!ok) ERR_print_errors_fp(stderr);
    OPENSSL_cleanse(a,sizeof(a)); OPENSSL_cleanse(b,sizeof(b));
    EVP_PKEY_CTX_free(e); EVP_PKEY_CTX_free(d); EVP_PKEY_free(k);
    return ok;
}
int main(int argc, char **argv) {
    if (argc!=2) return 2;
    int strict=!strcmp(argv[1],"fips");
    int ok=trial("ML-KEM-768",strict);
    ok &=trial("X25519MLKEM768",strict);
    ok &=trial("SecP256r1MLKEM768",strict);
    return !ok;
}
