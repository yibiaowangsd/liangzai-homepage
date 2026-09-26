# PQC 武器实战

页面的完整静态运行资源位于 `public/pqc-practice/`，可从 `/pqc-practice/index.html` 直接打开。量仔主页的 `/pqc-practice` 路径也会转到该页面。

密钥交换与哈希候选、参数和本地运行都在主工作台选择。左侧可折叠列表按 NIST 标准算法与 2026 国内征集两组展示算法类别及候选；旧 `/pqc-practice/kex.html`、`/pqc-practice/hash.html` 已删除。NIST 组只提供 [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) 的 ML-KEM、[FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) 的 ML-DSA、[FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) 的 SLH-DSA；固定哈希的参数不显示多余选项，SLH-DSA 可选择 SHA2 或 SHAKE。`/pqc-practice/audit.html` 按参数列出全部 586 个实例的提交团队、参考实现目录和**当前发布版本**的接入状态，顶部按类别展开完全未接入和部分接入的候选，点击可筛选未接入参数并导出 CSV。[完整不可运行清单](pqc-unavailable.md)包含缺失参数名称及构建原因，可通过仓库脚本重新生成。目录不把通用 SHA 计算冒充为征集算法，也不把“未接入”写成“源码不存在”或“编译失败”。工作台与接入记录均面向桌面浏览器。

首批接入的哈希候选 AFS-TrEDM（`hash-01`）、AXIS（`hash-02`）、CHAMP（`hash-04`）、uHash（`hash-05`）、Eijen（`hash-09`）的共 16 组参数已从同一 ngcc-harness 快照源码编译成 WASM，各原生提交实现 KAT 均通过。首批 AFS-TrEDM 三组参数的浏览器 WASM 的空消息、`abc`、`abc!` 摘要逐一与同源码原生结果比对；其余 13 组先通过 KAT 与 WASM 多消息运行检查，后续批次的构建脚本会额外保存原生摘要供逐项比对。主工作台仅在 `ngcc-hash-runtime.js` 已登记该参数时显示摘要计算输入框，在 Web Worker 中计算并设置 30 秒上限。`scripts/build-ngcc-expanded.py` 按候选/参数限时编译，失败产物会删除，逐项日志保存在工作流产物中；构建工具链和源码版本固定在 `.github/workflows/ngcc-wasm-rebuild.yml`。成功编译仅证明所测输入的功能一致，不代表算法安全认证。

后续批量构建从该快照已有 Makefile 的 71 个候选逐参数尝试（包括较慢的签名和密钥交换）。28 个隔离任务在 `ngcc-wasm-rebuild.yml` 中列出待尝试的剩余 59 个候选；5 个较早接入的 KEM/签名候选、5 个先前哈希候选及 2 个新接入的 KEM 候选已单独构建。`check-ngcc-native.py` 对原生测试向量逐参数设置时限，`ngcc-native-hash-vectors.py` 保存原生参考摘要，`build-ngcc-expanded.py` 构建 WASM 并运行相应往返或原生摘要比对。原生测试失败时仍会尝试编译，但不会发布该产物。浏览器密钥交换已并入主工作台；仅在双方的完整协议产出相同共享密钥时登记模块。最终提交的 `ngcc-build-status.json` 逐参数记载构建结果，并从接入记录页链接至 Actions 逐项日志；“本快照未收录源码”仅说明所固定的 ngcc-harness 提交没有对应的可构建目录，不表示官方未公开提交包。

其余 48 个候选的官方归档链接已逐项从 GitHub Actions 运行环境尝试读取；48 个 GET 请求均返回 HTTP 405。结果记载在 `ngcc-official-probe.json` 及对应的 [工作流](https://github.com/yibiaowangsd/liangzai-homepage/actions/runs/36096545542) 中。HTTP 405 是该次下载访问失败，不是提交源码不存在的证据；由于没有取到源码，这 48 个候选的 249 组参数无法据此宣称已完成编译或 KAT 验证。

这份页面以 ChatGPT Sites 的“PQC 会话实验室”源码提交 `6397843359f3b1273e1f430abf7aac69e369489e` 为基础，保留 NIST 三类算法的 18 组 WASM 参数组合及原来的密钥生成、封装、解封装、签名和验签交互；非标准的 Aigis 与 SM3 选项及对应的 22 组 WASM 已从这一组移除。原页面底部的快速自检已移除。可运行流程在浏览器的 Web Worker 中执行，数据无需发送到后端。浏览器需支持 WebAssembly 与 Web Crypto。

`ngcc-catalog.json` 快照取自 [ngcc-harness](https://github.com/ngcc-dev/ngcc-harness) 提交 `c5261784ef27e7363b1bbace3d687932fda35ccd` 的 `downloads.csv`、`data/parameters.csv` 和 `data/{kem,sign,kex,hash}.csv`，按官方候选编号列出 41 个 KEM、34 个签名、9 个密钥交换及 35 个哈希候选，合计 119 个候选、586 个实现参数实例。每项提供官方候选页、提交源码包、提交团队成员、实例参数与参考实现目录。数据可用 `python3 scripts/generate-ngcc-catalog.py /path/to/ngcc-harness` 重新生成；候选数量改变时生成脚本会要求人工核对。

当前仓库的运行映射登记 80 个候选、325 组参数（密钥封装/签名 160 组、密钥交换 32 组、哈希 133 组），对应 WASM 文件已收录；未登记的参数仅展示资料、团队与源码链接，**没有可运行操作**。下表保留最初一批的实现适配记录：

| 候选 | 参数实例 | 来源与适配 |
| --- | --- | --- |
| Aigis-Enc+ (`kem-01`) | Aigis-enc1/2/3 | 提交的参考实现；在编译副本中修复密文拒绝路径的回退秘密越界读取与隐式拒绝失效 |
| BW-KEM (`kem-08`) | BW_KEM_C128/256/512 | 提交的参考实现；复用原 Makefile 的实例编译宏 |
| NTRE (`kem-27`) | NTRE-128/256/512 | 提交的参考实现；复用其 ICCS 接口 |
| WeaverKEM (`kem-39`) | WeaverKEM-128/256/512 | 提交的参考实现；保留归档实现中的已公开问题，详情见页底报告 |
| Aigis-Sig+ (`sign-01`) | Aigis-sig1/2/3 | 提交的参考实现；在编译副本中修复 WASM 指针对齐、提示计数和正常签名越界写入；已公开的签名可塑性尚未修复 |

构建命令：在 Emscripten 6.0.10 环境中执行 `bash scripts/build-ngcc-wasm.sh /path/to/ngcc-harness`。脚本逐参数输出 `public/pqc-practice/wasm/ngcc-*.mjs/.wasm`，使用固定的本地补丁脚本且不修改原源码仓库；参数与已构建模块的精确映射见 `ngcc-runtime.js`。每次密钥生成、封装或签名先由浏览器 Web Crypto 产生 48 字节随机种子，再初始化提交实现的 ICCS DRNG。`node --test tests/ngcc-wasm.test.mjs` 对全部 15 个实际模块检查公开参数长度、真实密钥/共享密钥或签名往返，并检查篡改密文或消息不会被当成原结果；Aigis-enc1 还核对了与原生参考实现相同种子下的公钥、私钥、密文和共享密钥散列。它只证明这些测试输入上的功能行为，**不代表安全评估、完整向量认证或恒定时间保证**。

安全报告快照 `ngcc-report-index.json` 对照 [ngcc.dev 报告索引](https://ngcc.dev/reports/index.html) 2026-09-25 16:35:53 UTC 的版本：86 份候选报告，164 项有效发现和 2 条撤回记录。主工作台对 119 个征集候选都显示有无报告、每项发现的编号、严重程度、证据状态、影响类别与更新日期，并提供直达原报告及复现步骤的链接。[119 个候选的完整报告索引](pqc-security-index.md)可通过 `node scripts/generate-pqc-security-index.mjs` 从快照重新生成。`ngcc-reports.js` 保留针对 8 个候选 15 项发现的中文证据、影响边界和修复方向；其他条目展示来源索引信息并明确提示查看原文，不凭标题推断漏洞细节。报告所描述的是**归档提交源码**，改动过的浏览器构建可能不同。无报告不等于安全，撤回记录不能算作有效发现。NIST 组显示对应 FIPS 与实现来源，并说明本站没有针对该 WASM 的独立安全报告或 FIPS 实现认证。国内征集候选与 NIST 组中同名算法不应视为相同实现。

NIST 算法组保留的 WASM 仍由原 PQMagic 项目编译，标准名称指算法而非实现认证；上游提交记录与许可证副本分别为 `public/pqc-practice/PQMagic-UPSTREAM_COMMIT.txt` 与 `public/pqc-practice/PQMagic-LICENSE.txt`。国内征集的密钥交换候选在同页按实际桥接接口顺序逐轮呈现 Alice、Bob 的密钥/状态归属、消息方向和双方派生阶段；每次点击轮次是教学步骤，**不声称实际发送了该轮的报文字节**。轮次与派生阶段看完后，用户点击“执行完整协议并比对”，WASM 一次性运行实际提交实现、比较双方共享密钥，并返回轮数、总消息量、共享密钥指纹与耗时。现有 WASM 不导出逐轮报文，不能展示真实逐条内容。工作台沿用量仔主页的导航、黑银与冰蓝风格，主页设有专门的实战入口；更新 NIST 模块时应同步核对 JS 与 WASM 的配套关系，并保留征集目录功能。
