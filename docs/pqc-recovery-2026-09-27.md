# 2026-09-27 浏览器算法接入修复

固定源码版本 `c5261784ef27e7363b1bbace3d687932fda35ccd`，Emscripten 6.0.10。
本批尝试 18 组，新增接入 17 组；国内征集目录由 332/586 提升到 349/586。此前已验证模块保持不变。

| 算法 | 新增参数 | 修复 |
| --- | --- | --- |
| BRA | 128、256、512 | WASM 屏蔽未使用的 x86 头文件；BSR 用等价的非零前导零计数实现；Keccak 使用提交源码已有的 C 旋转分支 |
| BRQC | 128、256、512 | 同上 |
| C-Multi-UR-AG | 128、512 | 同上；256 的原生 KAT 通过，但 WASM 功能检查超过 30 秒，保持未接入 |
| NEV-AKE | 全部 9 档 | Linux 专用 errno 头文件改为标准头文件；修正页面总消息长度的含义 |

## NEV-AKE 消息长度

参考实现 `kex_get_total_msg_len_bytes()` 返回 `AKE_MAX_MESSAGE_BYTES`，即 `max(M1, M2)`，实际两轮输出分别是 `AKE_M1_BYTES` 和 `AKE_M2_BYTES`。本批九档的两条消息等长，总量应为原报告值的两倍。

目录在 `reportedTotalMessageBytes` 保留原声明值，`sizes.TotalMessageBytes` 记录实际总量。浏览器桥接层在核对原始 getter 后返回修正后的总量；每条消息缓冲区仍使用原始最大长度。算法运算、两条消息字节、随机数生成和密钥派生不变。检查器继续严格比较消息长度之和，不放宽验证条件。

## 验证与证据

- 18 组原生实现均通过提交的 KAT；原生编译不启用 WASM 专用算术分支。
- 发布的 8 组 KEM 通过密钥生成、封装、解封装和篡改密文检查；相同种子下公钥、私钥、密文、共享密钥的 SHA-256 与原生参考实现逐项一致。
- 发布的 9 组 KEX 通过完整及逐步交换、错误顺序和重复步骤拒绝、独立派生、会话清理检查；两个固定种子下的共享密钥与原生实现一致。
- Chromium 中 17 组均通过真实 Worker 随机输入运行；四个候选的页面生成、发送、封装/解封装或两轮密钥交换操作完整通过，无浏览器运行时错误。生产构建、22 项相关回归测试通过；ESLint 无错误。
- 模块文件摘要、原生对照摘要及逐参数状态保存在 [机器可读接入记录](../public/pqc-practice/ngcc-recovery-2026-09-27.json)。新增回归测试验证这些摘要和原生/WASM 对照结果。
- 原有安全报告仍保留；这里的接入状态代表演示功能验证，不替代其报告结论。

## 复现

在一次性的源码检出上执行 `scripts/patch-ngcc-portable-20260927.py <harness>`。修补器校验预期文件数量和代码片段，支持重复执行；原生 x86 路径不变。

针对 `kem-06`、`kem-07`、`kem-10`、`kex-07` 分别：

1. `make -C <harness>/api harness`，然后运行 `scripts/check-ngcc-native.py <harness> <id> --seconds 90 --budget 450`。
2. 清理该候选的原生构建对象后，启用 Emscripten 6.0.10，运行 `scripts/build-ngcc-expanded.py <harness> <id> --seconds 90 --native-status-file work/ngcc-wasm-rebuild/<id>.native-status.json`。每次保存 `results.json` 为 `<id>.results.json`。
3. 再次清理该候选对象、使用 GCC 构建 `libs`；用 `ngcc-native-kem-vectors.py`（`--indices` 指定通过的参数）或 `ngcc-native-kex-vectors.py` 导出原生摘要。
4. `node scripts/check-ngcc-module.mjs <module.mjs> <id> <index> <native-vectors.json>`，逐参数设置外部 30 秒限额。仅发布两个检查均通过的 `.mjs`/`.wasm` 对和对应映射。
5. `node scripts/generate-pqc-availability.mjs` 刷新统计，再执行 `node --test tests/ngcc-portable-recovery.test.mjs tests/ngcc-catalog.test.mjs`。

## 后续阻塞

C-Multi-UR-AG-256 仍超时，未生成可选映射。CTL 已取得并校验官方归档；检查发现模板构建问题之外，其 NTRU 求解还依赖 GMP、quadmath 和 `__float128`，不通过降低浮点精度来勉强接入。其余依赖移植和原生失败项不属于本批发布范围。
