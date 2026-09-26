# PQC 武器实战：暂不可运行的算法与参数

目录快照：c5261784ef27e7363b1bbace3d687932fda35ccd。此表根据当前仓库的运行映射、已收录的 JS/WASM 文件和逐参数构建记录生成。运行 `node scripts/generate-pqc-availability.mjs` 可重新核对。

119 个国内征集候选、586 组参数中，325 组已接入，261 组未接入；39 个候选完全无法运行，12 个候选仅部分参数能运行。

未接入原因（组数）：原生测试超时 8；WASM 运行失败 49；编译失败 78；原生测试失败 48；编译或运行超时 10；本快照未收录源码 68。

“本快照未收录源码”只表示固定的 ngcc-harness 快照没有对应实现目录，不代表官方未公开源码。功能测试通过也不等于安全认证。

## 密钥封装

| 编号与候选 | 可运行参数 | 尚不可运行的参数 | 原因（组数） |
| --- | ---: | --- | --- |
| kem-05 · BIKE-MLThre | 0/3 | BIKE_v2_128、BIKE_v2_256、BIKE_v2_512 | 本快照未收录源码 3 |
| kem-06 · BRA | 0/3 | BRA-128、BRA-256、BRA-512 | 编译失败 3 |
| kem-07 · BRQC | 0/3 | BRQC-128、BRQC-256、BRQC-512 | 编译失败 3 |
| kem-10 · C-Multi-UR-AG | 0/3 | CMultiURAG-128、CMultiURAG-256、CMultiURAG-512 | 编译失败 3 |
| kem-11 · COMPASS-KEM | 1/4 | COMPASS-KEM-256、COMPASS-KEM-384、COMPASS-KEM-512 | WASM 运行失败 3 |
| kem-12 · CTL Algorithm | 0/3 | CTL-257-512、CTL-3329-2048、CTL-769-1024 | 编译失败 3 |
| kem-13 · DKEM (Ding Key Encapsulation) | 0/3 | DKEM-128、DKEM-256、DKEM-512 | 编译失败 3 |
| kem-14 · DTRU | 7/12 | DTRU-1024-PACK_PK、DTRU-1536-PACK_PK、DTRU-2048-PACK_PK、DTRU-648-PACK_PK、DTRU-768-PACK_PK | WASM 运行失败 5 |
| kem-16 · HARE | 0/4 | HARE-128-kr、HARE-256-kr、HARE-384-kr、HARE-512-kr | 本快照未收录源码 4 |
| kem-17 · Hybrid Equivalent Punctured and Quasi-Cyclic | 0/4 | hep-qc-1、hep-qc-3、hep-qc-5、hep-qc-7 | 编译失败 4 |
| kem-19 · Lore | 0/8 | Lore-L1 · Lore-SHAKE/Lore-L1、Lore-L1 · Lore-SM3/Lore-L1、Lore-L2 · Lore-SHAKE/Lore-L2、Lore-L2 · Lore-SM3/Lore-L2、Lore-L3 · Lore-SHAKE/Lore-L3、Lore-L3 · Lore-SM3/Lore-L3、Lore-L4 · Lore-SHAKE/Lore-L4、Lore-L4 · Lore-SM3/Lore-L4 | 本快照未收录源码 8 |
| kem-20 · MAMBA-Frost | 0/10 | MAMBA-Frost-128、MAMBA-Frost-192、MAMBA-Frost-256、MAMBA-Frost-384、MAMBA-Frost-512、MAMBA-Frost-CC-128、MAMBA-Frost-CC-192、MAMBA-Frost-CC-256、MAMBA-Frost-CC-384、MAMBA-Frost-CC-512 | 本快照未收录源码 10 |
| kem-25 · NEV | 0/12 | NEV_1024_1409_ICCS、NEV_1024_3329_ICCS、NEV_1024_769_C_ICCS、NEV_1024_769_ICCS、NEV_2048_1409_ICCS、NEV_2048_3329_ICCS、NEV_2048_769_C_ICCS、NEV_2048_769_ICCS、NEV_512_1409_ICCS、NEV_512_3329_ICCS、NEV_512_769_C_ICCS、NEV_512_769_ICCS | 本快照未收录源码 12 |
| kem-30 · PolarLAC | 0/5 | POLARLAC-128、POLARLAC-256、POLARLAC-512、POLARLAC-512-Star、POLARLAC-Light | 原生测试失败 5 |
| kem-31 · QIMEN-PIKE | 0/3 | NGCC-1、NGCC-2、NGCC-3 | 编译失败 3 |
| kem-32 · Quasi-Cyclic Twisted McEliece Key Encapsulation Mechanism | 0/3 | QCTM128、QCTM256、QCTM512 | 编译失败 3 |
| kem-33 · QUBE | 0/5 | qube_128、qube_192、qube_256、qube_384、qube_512 | 原生测试失败 5 |
| kem-34 · Rudraksh2 | 0/3 | lwekem128、lwekem256、lwekem512 | WASM 运行失败 3 |
| kem-35 · Scloud+ | 0/15 | Scloudplus-128-AES-packed10、Scloudplus-128-SHAKE-packed10、Scloudplus-128-SM3-packed10、Scloudplus-192-AES-packed10、Scloudplus-192-SHAKE-packed10、Scloudplus-192-SM3-packed10、Scloudplus-256-AES-packed10、Scloudplus-256-SHAKE-packed10、Scloudplus-256-SM3-packed10、Scloudplus-384-AES-packed10、Scloudplus-384-SHAKE-packed10、Scloudplus-384-SM3-packed10、Scloudplus-512-AES-packed10、Scloudplus-512-SHAKE-packed10、Scloudplus-512-SM3-packed10 | 本快照未收录源码 15 |
| kem-38 · UVW Key Encapsulation Mechanism | 0/3 | UVW_KEM_128、UVW_KEM_256、UVW_KEM_512 | 编译或运行超时 3 |

## 数字签名

| 编号与候选 | 可运行参数 | 尚不可运行的参数 | 原因（组数） |
| --- | ---: | --- | --- |
| sign-03 · CEDRUS+C | 7/8 | CEDRUSC-512s | 原生测试超时 1 |
| sign-04 · CEDRUSɑ | 7/8 | CEDRUSALPHA-512s | 原生测试超时 1 |
| sign-05 · Chinith | 0/14 | sm4th_d3_128f_loose、sm4th_d3_128f_tight、sm4th_d3_128s_loose、sm4th_d3_128s_tight、sm4th_em_d2_128f_loose、sm4th_em_d2_128f_tight、sm4th_em_d2_128s_loose、sm4th_em_d2_128s_tight、ublockith_d3_256f、ublockith_d3_256s、ublockith_em_d3_256f、ublockith_em_d3_256s、vistrutith_d3_512f、vistrutith_d3_512s | WASM 运行失败 6；编译失败 8 |
| sign-06 · COMPASS-SIG | 1/4 | COMPASS-SIG-128、COMPASS-SIG-384、COMPASS-SIG-512 | WASM 运行失败 3 |
| sign-09 · DOVE | 0/6 | dove_classic_128、dove_classic_256、dove_classic_512、dove_pkc_skc_128、dove_pkc_skc_256、dove_pkc_skc_512 | 原生测试失败 2；WASM 运行失败 4 |
| sign-10 · Facto-DSA | 2/3 | Facto-DSA-512 | 原生测试失败 1 |
| sign-11 · FlexTree | 5/8 | Flextree-384s、Flextree-512f、Flextree-512s | 原生测试超时 3 |
| sign-12 · Galas Signature Scheme | 0/8 | Galas-160F、Galas-160S、Galas-256F、Galas-256S、Galas-384F、Galas-384S、Galas-512F、Galas-512S | 原生测试失败 5；编译或运行超时 3 |
| sign-13 · GreatWall Signature Algorithm | 7/8 | GreatWall512s | 原生测试超时 1 |
| sign-14 · Lynxer | 0/8 | Lynxer-160f、Lynxer-160s、Lynxer-256f、Lynxer-256s、Lynxer-384f、Lynxer-384s、Lynxer-512f、Lynxer-512s | 原生测试失败 8 |
| sign-15 · MORNING-ATLAS | 0/4 | lwrdsa128、lwrdsa192、lwrdsa256、lwrdsa512 | WASM 运行失败 4 |
| sign-18 · Origami | 3/4 | Origami-512 | 编译或运行超时 1 |
| sign-19 · Phoenix | 0/20 | Phoenix-SHAKE-128f、Phoenix-SHAKE-128s、Phoenix-SHAKE-192f、Phoenix-SHAKE-192s、Phoenix-SHAKE-256f、Phoenix-SHAKE-256s、Phoenix-SHAKE-384f、Phoenix-SHAKE-384s、Phoenix-SHAKE-512f、Phoenix-SHAKE-512s、Phoenix-SM3-128f、Phoenix-SM3-128s、Phoenix-SM3-192f、Phoenix-SM3-192s、Phoenix-SM3-256f、Phoenix-SM3-256s、Phoenix-SM3-384f、Phoenix-SM3-384s、Phoenix-SM3-512f、Phoenix-SM3-512s | 原生测试失败 15；原生测试超时 1；WASM 运行失败 4 |
| sign-21 · ReSolveD-ɑ | 0/8 | ReSolveD-alpha-160f、ReSolveD-alpha-160s、ReSolveD-alpha-256f、ReSolveD-alpha-256s、ReSolveD-alpha-384f、ReSolveD-alpha-384s、ReSolveD-alpha-512f、ReSolveD-alpha-512s | 原生测试失败 6；原生测试超时 1；编译或运行超时 1 |
| sign-23 · Shuttle | 1/3 | SHUTTLE-256、SHUTTLE-512 | 编译失败 2 |
| sign-25 · SQIsign2D2 | 0/16 | SQISign2Dsquare-Level1-eff_compressed、SQISign2Dsquare-Level1-eff_uncompressed、SQISign2Dsquare-Level1-sec_compressed、SQISign2Dsquare-Level1-sec_uncompressed、SQISign2Dsquare-Level2-eff_compressed、SQISign2Dsquare-Level2-eff_uncompressed、SQISign2Dsquare-Level2-sec_compressed、SQISign2Dsquare-Level2-sec_uncompressed、SQISign2Dsquare-Level3-eff_compressed、SQISign2Dsquare-Level3-eff_uncompressed、SQISign2Dsquare-Level3-sec_compressed、SQISign2Dsquare-Level3-sec_uncompressed、SQISign2Dsquare-Level5-eff_compressed、SQISign2Dsquare-Level5-eff_uncompressed、SQISign2Dsquare-Level5-sec_compressed、SQISign2Dsquare-Level5-sec_uncompressed | 编译失败 16 |
| sign-26 · SQIsign2D-push1/2 | 0/4 | SQIsign2D-lvl1、SQIsign2D-lvl2、SQIsign2D-lvl3、SQIsign2D-lvl4 | 本快照未收录源码 4 |
| sign-27 · SQIsignTriangle | 0/4 | SQIsignTriangle_lvl1、SQIsignTriangle_lvl2、SQIsignTriangle_lvl5、SQIsignTriangle_lvl6 | 编译失败 4 |
| sign-28 · SYDO | 0/6 | sydo_160f、sydo_160s、sydo_256f、sydo_256s、sydo_512f、sydo_512s | 本快照未收录源码 6 |
| sign-29 · Tins | 1/3 | Tins128、Tins512 | WASM 运行失败 2 |
| sign-30 · TRINE | 0/6 | TRINE-128-Balanced、TRINE-128-ShortSig、TRINE-256-Balanced、TRINE-256-ShortSig、TRINE-512-Balanced、TRINE-512-ShortSig | 本快照未收录源码 6 |
| sign-32 · UVW signature | 0/3 | UVW-128、UVW-256、UVW-512 | 编译失败 3 |
| sign-33 · VDOO: Vinegar-Diagonal-Oil-Oil | 2/3 | VDOO-512 | 编译或运行超时 1 |
| sign-34 · YuanYang.DSA | 0/3 | yuanyang-1024、yuanyang-2048、yuanyang-512 | WASM 运行失败 3 |

## 密钥交换

| 编号与候选 | 可运行参数 | 尚不可运行的参数 | 原因（组数） |
| --- | ---: | --- | --- |
| kex-01 · ADKEX (Authenticated Ding Key Exchange) | 0/3 | ADKEX-128、ADKEX-256、ADKEX-512 | 原生测试失败 1；WASM 运行失败 2 |
| kex-04 · DKEX (Ding Key Exchange) | 0/3 | DKEX-128、DKEX-256、DKEX-512 | 编译失败 3 |
| kex-05 · Loom | 0/3 | LoomKEX-128、LoomKEX-256、LoomKEX-512 | WASM 运行失败 3 |
| kex-06 · MAMBA-NIKE | 0/5 | MAMBA-NIKE-128、MAMBA-NIKE-192、MAMBA-NIKE-256、MAMBA-NIKE-384、MAMBA-NIKE-512 | WASM 运行失败 5 |
| kex-07 · NEV-AKE | 0/9 | NEV_AKE_1024_1409_ICCS、NEV_AKE_1024_769_C_ICCS、NEV_AKE_1024_769_ICCS、NEV_AKE_2048_1409_ICCS、NEV_AKE_2048_769_C_ICCS、NEV_AKE_2048_769_ICCS、NEV_AKE_512_1409_ICCS、NEV_AKE_512_769_C_ICCS、NEV_AKE_512_769_ICCS | 编译失败 9 |
| kex-08 · NIIKE | 0/3 | NIIKE-lv128、NIIKE-lv256、NIIKE-lv512 | 编译或运行超时 1；WASM 运行失败 2 |

## 哈希

| 编号与候选 | 可运行参数 | 尚不可运行的参数 | 原因（组数） |
| --- | ---: | --- | --- |
| hash-11 · Garnet | 0/8 | Garnet_1024、Garnet_1024_DM4x4、Garnet_512_Cap1024、Garnet_512_Cap512、Garnet_512_Cap640、Garnet_512_Cap768、Garnet_512_Cap896、Garnet_768 | 编译失败 8 |

逐项构建状态、源码与团队成员可在 [网站接入记录](../public/pqc-practice/audit.html) 中筛选与导出。
