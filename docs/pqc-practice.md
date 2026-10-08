# 密码实验室

完整运行资源位于 `public/pqc-practice/`。`/pqc-practice` 重定向到 `/pqc-practice/index.html`；`audit.html` 提供逐参数接入记录、来源、团队信息和 CSV 导出。

## 算法与运行状态

主工作台按 NIST 标准算法和 2026 国内征集两组选择算法。NIST 组提供 [ML-KEM / FIPS 203](https://csrc.nist.gov/pubs/fips/203/final)、[ML-DSA / FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) 和 [SLH-DSA / FIPS 205](https://csrc.nist.gov/pubs/fips/205/final)，保留 18 组 JS/WASM 参数组合。模块源自 PQMagic，提交与许可证副本位于 `PQMagic-UPSTREAM_COMMIT.txt` 和 `PQMagic-LICENSE.txt`。

国内征集目录快照来自 [ngcc-harness](https://github.com/ngcc-dev/ngcc-harness) 的 `c5261784ef27e7363b1bbace3d687932fda35ccd`，包含 119 个候选和 586 个参数实例。当前可运行数量由映射与已收录文件决定，不沿用历史构建批次统计。

| 数据或映射 | 用途 |
| --- | --- |
| `ngcc-catalog.json` | 候选、参数、团队与参考实现目录 |
| `ngcc-runtime.js` | 密钥封装与签名模块 |
| `ngcc-kex-runtime.js` | 密钥交换模块 |
| `ngcc-hash-runtime.js` | 哈希模块 |
| `ngcc-build-status.json` | 逐参数构建记录及失败原因 |
| `ngcc-report-index.json`、`ngcc-reports-zh.json` | 来源报告索引和已核对的中文详细说明 |

未登记的参数只能查看资料，不能执行运算。[不可运行清单](pqc-unavailable.md) 根据当前映射、JS/WASM 文件和构建记录生成；“本快照未收录源码”不表示官方没有公开源码。下载失败也不能当作源码不存在的证据。

## 浏览器运算

浏览器需支持 WebAssembly 和 Web Crypto。密钥封装、签名、密钥交换与哈希由 Web Worker 执行，算法输入无需发送到后端。密钥生成、封装或签名通过浏览器随机种子初始化提交实现的 DRNG。

密钥交换的 Worker 使用会话接口管理双方状态、逐轮消息传递和独立派生。接口顺序和参数长度需与对应 WASM 配套；不能将旧模块的完整协议执行接口和新会话接口混用。哈希计算在独立 Worker 中运行并设有超时。

功能往返、原生对照摘要和 KAT 仅证明所测输入的行为；不代表完整安全评估、恒定时间保证或 FIPS 实现认证。国内候选与 NIST 组中的同名算法不应视为相同实现。

## 构建与适配

普通页面开发直接使用已收录的 WASM，无需安装 Emscripten 或重新编译全部候选。构建工具链与源码版本以 `.github/workflows/ngcc-wasm-rebuild.yml` 和相关候选工作流为准，现有批量构建使用 Emscripten 6.0.10。

`scripts/build-ngcc-wasm.sh` 负责首批 KEM/签名适配，`build-ngcc-expanded.py` 与 `run-ngcc-batch.sh` 负责扩展批次；原生检查、向量生成和模块检查由对应 `check-ngcc-*`、`ngcc-native-*` 脚本执行。在一次性构建副本应用固定补丁，保留提交来源和修补证据；只有通过所需功能检查的模块才能登记。

早期 Aigis-Enc+ 的拒绝路径修补、Aigis-Sig+ 的对齐及越界修补不覆盖全部已公开安全问题。具体批次、原生对照和未解决项见 [重建记录](pqc-rebuild-2026-09-26.md) 与 [接入修复记录](pqc-recovery-2026-09-27.md)，报告结论另见下文。

重新生成目录需要本地 ngcc-harness 快照：

```bash
python3 scripts/generate-ngcc-catalog.py /path/to/ngcc-harness
```

生成器要求人工核对候选数量变化。重新生成可用性与安全索引的命令集中在 [开发指南](../DEVELOPMENT.md)。

## 安全报告与验证

[安全报告索引](pqc-security-index.md) 整理归档报告快照的有效发现、撤回记录、严重程度和证据状态，并链接原报告。中文详细说明只覆盖已核对条目，其余条目要求查看原文。报告针对归档提交版本；修改过的浏览器实现可能不同。无报告不等于安全，撤回记录不计作有效发现。

现有 `tests/ngcc-wasm.test.mjs`、`ngcc-kex-wasm.test.mjs`、`ngcc-hash-wasm.test.mjs` 等用例执行真实运算和适用的原生对照；无法运行的参数明确跳过。更新模块时核对 JS/WASM 配对、公开长度、真实往返、拒绝或篡改路径、来源与运行映射，再按开发指南运行验证。
