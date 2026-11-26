package main

import (
	"bytes"
	"crypto"
	"crypto/mldsa"
	"crypto/rand"
	"crypto/x509"
	"fmt"
	"os"
	"strings"
)

func read(path string) []byte {
	data, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}
	return data
}

func main() {
	msg := read("msg.txt")
	cases := []struct{ name, unsupported string }{
		{"valid-seed", ""},
		{"valid-expanded", "without seed are not supported"},
		{"valid-both", "with both seed and expanded key are not supported"},
		{"invalid-both", "with both seed and expanded key are not supported"},
		{"invalid-tr", "without seed are not supported"},
		{"invalid-t0", "without seed are not supported"},
	}
	for _, c := range cases {
		parsed, err := x509.ParsePKCS8PrivateKey(read(c.name + ".der"))
		if c.unsupported != "" {
			if err == nil || !strings.Contains(err.Error(), c.unsupported) {
				panic(fmt.Sprintf("%s: unexpected parse result: %v", c.name, err))
			}
			fmt.Println(c.name + ": format unsupported")
			continue
		}
		if err != nil {
			panic(err)
		}
		key, ok := parsed.(*mldsa.PrivateKey)
		if !ok {
			panic("expected ML-DSA private key")
		}
		pub, err := x509.MarshalPKIXPublicKey(key.Public())
		if err != nil || !bytes.Equal(pub, read("reference.spki")) {
			panic("SPKI mismatch")
		}
		for _, positive := range []string{"valid-seed", "valid-expanded", "valid-both"} {
			if err := mldsa.Verify(key.PublicKey(), msg, read(positive+".sig"), nil); err != nil {
				panic(err)
			}
		}
		sig, err := key.Sign(rand.Reader, msg, crypto.Hash(0))
		if err != nil || len(sig) != 2420 {
			panic("Go sign failed")
		}
		if err := os.WriteFile("go.sig", sig, 0600); err != nil {
			panic(err)
		}
		fmt.Println(c.name + ": same SPKI; verified all three OpenSSL signatures")
	}
}
