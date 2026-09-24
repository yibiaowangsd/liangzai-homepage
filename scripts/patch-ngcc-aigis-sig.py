"""Apply reviewed wasm32 and bounds fixes to a copy of the Aigis-Sig+ source.

The submitted source is left untouched. Input hashes pin the four files that
this patch understands; a changed submission must be reviewed again.
"""

import hashlib
import sys
from pathlib import Path


SOURCE_HASHES = {
    "pspm.c": "b56a383b4f78da006ae06fc8be3343ec1f5c36ae6a6ca10e5949e7c2bf2174f2",
    "polyvec.c": "6135af45e15902f949aeab8e323e4255aa405618ec85bfe80351578bc0c49baf",
    "packing.c": "58974eee686ba6b9f378f60e9d38aec2154deffde815d41a4ef21985f37b5d1d",
    "sign.c": "f32621121eda9d5427f25564004685254f2a2542e2af4d34f93f351a550b6bd9",
}


def change(source, old, new, label):
    if source.count(old) != 1:
        raise ValueError(f"Expected one {label} match, got {source.count(old)}")
    return source.replace(old, new, 1)


def patch_pspm(source):
    source = change(source, "load64(uint8_t *t)", "load64(const uint8_t *t)", "const load")
    source = change(source, "    uint64_t *w64 = (uint64_t *) w;\n    uint64_t *s64;\n", "", "cs1 aliases")
    source = change(source, """                s64 = s1_table[l] + PARAM_N - i + (PARAM_N & (c->coeffs[i] >> 31));
                for (int j = 0; j < PARAM_N / 8; j++)\x20
                {
                    w64[j] += s64[j];
                }
""", """                const uint8_t *src = s1_table[l] + PARAM_N - i + (PARAM_N & (c->coeffs[i] >> 31));
                for (int j = 0; j < PARAM_N / 8; j++) {
                    uint64_t sum = load64(w + j * 8) + load64(src + j * 8);
                    store64(w + j * 8, sum);
                }
""", "cs1 unaligned loads")
    source = change(source, "    uint64_t *s64;\n    uint64_t *w64 = (uint64_t *) w;\n    uint16_t *stable16;",
                    "    const uint16_t *stable16;", "cs2 level 1 aliases")
    source = change(source, "                s64 = stable16;\n", "", "cs2 level 1 unused alias")
    source = change(source, "load64(w + j * 4)", "load64((const uint8_t *)(w + j * 4))", "cs2 level 1 load")
    source = change(source, "load64(stable16 + j * 4)", "load64((const uint8_t *)(stable16 + j * 4))", "cs2 level 1 source")
    source = change(source, "store64(w + j * 4, f + e)", "store64((uint8_t *)(w + j * 4), f + e)", "cs2 level 1 store")
    source = change(source, "    uint64_t *s64;\n    uint64_t *w64 = w;\n", "", "cs2 other aliases")
    source = change(source, """                s64 = stable8;
                for (int j = 0; j < PARAM_N / 8; j++)
                    w64[j] += s64[j];
""", """                for (int j = 0; j < PARAM_N / 8; j++) {
                    uint64_t sum = load64(w + j * 8) + load64(stable8 + j * 8);
                    store64(w + j * 8, sum);
                }
""", "cs2 other unaligned loads")
    return source


def patch_polyvec(source):
    return change(source, "  polyz_unpack(v->vec + i, outbuf);\n  return 0;", "  return 0;", "extra mask polynomial write")


def patch_packing(source):
    source = change(source, "\tint max = sm[0];\n\n\tfor (int i = 0; i < PARAM_K; i++)",
                    "\tint max = sm[0];\n\tif (max > PARAM_K * PARAM_N / SEC) return 1;\n\n\tfor (int i = 0; i < PARAM_K; i++)", "hint bucket bound")
    source = change(source, "\tfor (i = 0; i < max; i++)\n\t\tk += t[i];\n\n\tunpack6bits(pos, sm, k);",
                    "\tfor (i = 0; i < max; i++) {\n\t\tk += t[i];\n\t\tif (k > OMEGA) return 1;\n\t}\n\n\tunpack6bits(pos, sm, k);", "hint positions bound")
    source = change(source, "\t\tfor (start = 0; start < t[k]; start++)\n\t\t\th->vec[i].coeffs[SEC * j + pos[r++]] = 1;",
                    "\t\tfor (start = 0; start < t[k]; start++) {\n\t\t\tif (pos[r] >= SEC) return 1;\n\t\t\th->vec[i].coeffs[SEC * j + pos[r++]] = 1;\n\t\t}", "hint coefficient bound")
    return source


def patch_sign(source):
    return change(source, "  unpack_sig(&z, &h, cseed, sm);",
                  "  if (unpack_sig(&z, &h, cseed, sm)) return 1;", "hint decode result")


def main():
    source_dir, output_dir = map(Path, sys.argv[1:3])
    output_dir.mkdir(parents=True, exist_ok=True)
    transforms = {"pspm.c": patch_pspm, "polyvec.c": patch_polyvec,
                  "packing.c": patch_packing, "sign.c": patch_sign}
    for filename, transform in transforms.items():
        original = (source_dir / filename).read_bytes()
        digest = hashlib.sha256(original).hexdigest()
        if digest != SOURCE_HASHES[filename]:
            raise ValueError(f"{filename}: unreviewed source hash {digest}")
        patched = transform(original.decode("utf-8-sig").replace("\r\n", "\n"))
        (output_dir / filename).write_text(patched, encoding="utf-8")


if __name__ == "__main__":
    main()
