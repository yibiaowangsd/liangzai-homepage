# 2026-09-26 NGCC 重编译结果

- 重试 78 个编译失败参数和 10 个超时参数；68 个源码未收录参数未尝试。
- 新增通过 7 个 Garnet 参数；Garnet_1024_DM4x4 原生 KAT 不一致，未发布。
- Garnet 多参数共享源码目录，现按参数标签选构建目标，避免构建与原生对照使用错误实例。
- DKEM 的 DRNG 重复定义及 HEP-QC 缺少 size_t 声明已作构建适配；这 7 项仍未通过 WASM 检查。
- 编译、链接单步限时 90 秒，WASM 运行 30 秒，额外原生 KAT 120 秒；保留失败，不降低测试门槛。
- 原始源码固定为 c5261784ef27e7363b1bbace3d687932fda35ccd，工具链 Emscripten 6.0.10。

## 复现

使用 `scripts/retry-ngcc-failures.py <固定源码目录>` 重试当前失败参数，结果留在 `work/retry-*`；需要官方补充源码的候选由校验过的归档脚本准备。Garnet 需先运行原生 KAT 与摘要向量提取，再编译对应标签。

## 逐参数结果

| 候选 | 参数 | 原结果 | 重试结果 | 原因 |
| --- | --- | --- | --- | --- |
| hash-11 | Garnet_1024 | compile_failed | verified | 原生官方 KAT 通过，WASM 三条摘要与原生输出一致。 |
| hash-11 | Garnet_1024_DM4x4 | compile_failed | native_failed | 已按参数标签正确编译；Garnet_1024_DM4x4 原生 KAT 与提交清单不一致，暂不发布。 |
| hash-11 | Garnet_512_Cap1024 | compile_failed | verified | 原生官方 KAT 通过，WASM 三条摘要与原生输出一致。 |
| hash-11 | Garnet_512_Cap512 | compile_failed | verified | 原生官方 KAT 通过，WASM 三条摘要与原生输出一致。 |
| hash-11 | Garnet_512_Cap640 | compile_failed | verified | 原生官方 KAT 通过，WASM 三条摘要与原生输出一致。 |
| hash-11 | Garnet_512_Cap768 | compile_failed | verified | 原生官方 KAT 通过，WASM 三条摘要与原生输出一致。 |
| hash-11 | Garnet_512_Cap896 | compile_failed | verified | 原生官方 KAT 通过，WASM 三条摘要与原生输出一致。 |
| hash-11 | Garnet_768 | compile_failed | verified | 原生官方 KAT 通过，WASM 三条摘要与原生输出一致。 |
| kem-06 | BRA-128 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-06 | BRA-256 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-06 | BRA-512 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-07 | BRQC-128 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-07 | BRQC-256 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-07 | BRQC-512 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-10 | CMultiURAG-128 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-10 | CMultiURAG-256 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-10 | CMultiURAG-512 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| kem-12 | CTL-257-512 | compile_failed | compile_failed | 构建列表把内部模板源文件作为独立编译单元，出现未实例化类型或宏。 |
| kem-12 | CTL-3329-2048 | compile_failed | compile_failed | 构建列表把内部模板源文件作为独立编译单元，出现未实例化类型或宏。 |
| kem-12 | CTL-769-1024 | compile_failed | compile_failed | 构建列表把内部模板源文件作为独立编译单元，出现未实例化类型或宏。 |
| kem-13 | DKEM-128 | compile_failed | runtime_failed | 编译成功，但密钥生成返回失败。 |
| kem-13 | DKEM-256 | compile_failed | runtime_failed | 编译成功，但 WASM 功能、输出长度或一致性检查失败。 |
| kem-13 | DKEM-512 | compile_failed | runtime_failed | 编译成功，但 WASM 功能、输出长度或一致性检查失败。 |
| kem-17 | hep-qc-1 | compile_failed | runtime_failed | 编译成功，但密钥生成返回失败。 |
| kem-17 | hep-qc-3 | compile_failed | runtime_failed | 编译成功，但密钥生成返回失败。 |
| kem-17 | hep-qc-5 | compile_failed | runtime_failed | 编译成功，但密钥生成返回失败。 |
| kem-17 | hep-qc-7 | compile_failed | runtime_failed | 编译成功，但密钥生成返回失败。 |
| kem-31 | NGCC-1 | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| kem-31 | NGCC-2 | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| kem-31 | NGCC-3 | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| kem-32 | QCTM128 | compile_failed | compile_failed | 依赖 OpenSSL，当前 WASM 工具链没有对应头文件和库。 |
| kem-32 | QCTM256 | compile_failed | compile_failed | 依赖 OpenSSL，当前 WASM 工具链没有对应头文件和库。 |
| kem-32 | QCTM512 | compile_failed | compile_failed | 依赖 OpenSSL，当前 WASM 工具链没有对应头文件和库。 |
| kem-38 | UVW_KEM_128 | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |
| kem-38 | UVW_KEM_256 | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |
| kem-38 | UVW_KEM_512 | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |
| kex-04 | DKEX-128 | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-04 | DKEX-256 | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-04 | DKEX-512 | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_1024_1409_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_1024_769_C_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_1024_769_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_2048_1409_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_2048_769_C_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_2048_769_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_512_1409_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_512_769_C_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-07 | NEV_AKE_512_769_ICCS | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| kex-08 | NIIKE-lv128 | timeout | runtime_failed | 编译成功，但完整交换未生成一致共享密钥。 |
| sign-05 | sm4th_d3_128f_tight | compile_failed | compile_failed | 提交代码使用未声明的 lambda 标识符，编译失败。 |
| sign-05 | sm4th_d3_128s_tight | compile_failed | compile_failed | 提交代码使用未声明的 lambda 标识符，编译失败。 |
| sign-05 | ublockith_d3_256f | compile_failed | compile_failed | 提交构建列表缺少实现函数或依赖，链接存在未定义符号。 |
| sign-05 | ublockith_d3_256s | compile_failed | compile_failed | 提交构建列表缺少实现函数或依赖，链接存在未定义符号。 |
| sign-05 | ublockith_em_d3_256f | compile_failed | compile_failed | 提交构建列表缺少实现函数或依赖，链接存在未定义符号。 |
| sign-05 | ublockith_em_d3_256s | compile_failed | compile_failed | 提交构建列表缺少实现函数或依赖，链接存在未定义符号。 |
| sign-05 | vistrutith_d3_512f | compile_failed | compile_failed | 提交实现与适配层存在重复全局符号，链接失败。 |
| sign-05 | vistrutith_d3_512s | compile_failed | compile_failed | 提交实现与适配层存在重复全局符号，链接失败。 |
| sign-12 | Galas-384S | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |
| sign-12 | Galas-512F | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |
| sign-12 | Galas-512S | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |
| sign-18 | Origami-512 | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |
| sign-21 | ReSolveD-alpha-384s | timeout | native_timeout | WASM 功能检查通过，但原生 KAT 在 120 秒限额内未完成。 |
| sign-23 | SHUTTLE-256 | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| sign-23 | SHUTTLE-512 | compile_failed | compile_failed | 源码编译未通过；具体编译器诊断见本次日志摘录。 |
| sign-25 | SQISign2Dsquare-Level1-eff_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level1-eff_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level1-sec_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level1-sec_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level2-eff_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level2-eff_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level2-sec_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level2-sec_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level3-eff_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level3-eff_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level3-sec_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level3-sec_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level5-eff_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level5-eff_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level5-sec_compressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-25 | SQISign2Dsquare-Level5-sec_uncompressed | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-27 | SQIsignTriangle_lvl1 | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-27 | SQIsignTriangle_lvl2 | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-27 | SQIsignTriangle_lvl5 | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-27 | SQIsignTriangle_lvl6 | compile_failed | compile_failed | 依赖 GMP 多精度库，当前 WASM 工具链没有对应头文件和库。 |
| sign-32 | UVW-128 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| sign-32 | UVW-256 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| sign-32 | UVW-512 | compile_failed | compile_failed | 参考源码含 x86 专用头文件或内联汇编，不能直接编译为 wasm32。 |
| sign-33 | VDOO-512 | timeout | timeout | 在单步编译 90 秒或 WASM 检查 30 秒限额内未完成。 |

[构建日志摘录](../public/pqc-practice/ngcc-rebuild-2026-09-26.txt)
