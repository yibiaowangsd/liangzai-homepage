# PQC 武器实战

页面的完整静态运行资源位于 `public/pqc-practice/`，可从 `/pqc-practice/index.html` 直接打开。量仔主页的 `/pqc-practice` 路径也会转到该页面。

独立的哈希候选目录是 `/pqc-practice/hash.html`；`/pqc-practice/audit.html` 按参数列出全部 586 个实例的提交团队、参考实现目录和**当前发布版本**的接入状态，并可导出筛选后的 CSV。目录不把通用 SHA 计算冒充为征集算法，也不把“未接入”写成“源码不存在”或“编译失败”。两个页面均面向桌面浏览器。

哈希候选 AFS-TrEDM（`hash-01`）的 512/768/1024 三组参数已从同一 ngcc-harness 快照源码编译成 WASM，原生提交实现的三组 KAT 均通过；浏览器 WASM 的空消息、`abc`、`abc!` 摘要逐一与同源码原生结果比对。哈希页仅在 `ngcc-hash-runtime.js` 已登记该参数时显示输入框，在 Web Worker 中计算并设置 30 秒上限。`scripts/build-ngcc-expanded.py` 按候选/参数限时编译，失败产物会删除，逐项日志保存在工作流产物中；构建工具链和源码版本固定在 `.github/workflows/ngcc-wasm-rebuild.yml`。成功编译仅证明所测输入的功能一致，不代表算法安全认证。

这份页面以 ChatGPT Sites 的“PQC 会话实验室”源码提交 `6397843359f3b1273e1f430abf7aac69e369489e` 为基础，保留 40 组 PQMagic WASM 模块及其本地密钥生成、封装、解封装、签名和验签流程，并添加了算法库选择和征集候选目录。原页面底部的快速自检已移除。可运行流程在浏览器的 Web Worker 中执行，数据无需发送到后端。浏览器需支持 WebAssembly 与 Web Crypto。

`ngcc-catalog.json` 快照取自 [ngcc-harness](https://github.com/ngcc-dev/ngcc-harness) 提交 `c5261784ef27e7363b1bbace3d687932fda35ccd` 的 `downloads.csv`、`data/parameters.csv` 和 `data/{kem,sign,kex,hash}.csv`，按官方候选编号列出 41 个 KEM、34 个签名、9 个密钥交换及 35 个哈希候选，合计 119 个候选、586 个实现参数实例。每项提供官方候选页、提交源码包、提交团队成员、实例参数与参考实现目录。数据可用 `python3 scripts/generate-ngcc-catalog.py /path/to/ngcc-harness` 重新生成；候选数量改变时生成脚本会要求人工核对。

征集目录中的 5 个候选、15 个参数实例已用提交源码编译成真实 WASM；其余候选提供资料、团队与源码链接，**没有可运行操作**：

| 候选 | 参数实例 | 来源与适配 |
| --- | --- | --- |
| Aigis-Enc+ (`kem-01`) | Aigis-enc1/2/3 | 提交的参考实现；在编译副本中修复密文拒绝路径的回退秘密越界读取与隐式拒绝失效 |
| BW-KEM (`kem-08`) | BW_KEM_C128/256/512 | 提交的参考实现；复用原 Makefile 的实例编译宏 |
| NTRE (`kem-27`) | NTRE-128/256/512 | 提交的参考实现；复用其 ICCS 接口 |
| WeaverKEM (`kem-39`) | WeaverKEM-128/256/512 | 提交的参考实现；保留归档实现中的已公开问题，详情见页底报告 |
| Aigis-Sig+ (`sign-01`) | Aigis-sig1/2/3 | 提交的参考实现；在编译副本中修复 WASM 指针对齐、提示计数和正常签名越界写入；已公开的签名可塑性尚未修复 |

构建命令：在 Emscripten 6.0.10 环境中执行 `bash scripts/build-ngcc-wasm.sh /path/to/ngcc-harness`。脚本逐参数输出 `public/pqc-practice/wasm/ngcc-*.mjs/.wasm`，使用固定的本地补丁脚本且不修改原源码仓库；参数与已构建模块的精确映射见 `ngcc-runtime.js`。每次密钥生成、封装或签名先由浏览器 Web Crypto 产生 48 字节随机种子，再初始化提交实现的 ICCS DRNG。`node --test tests/ngcc-wasm.test.mjs` 对全部 15 个实际模块检查公开参数长度、真实密钥/共享密钥或签名往返，并检查篡改密文或消息不会被当成原结果；Aigis-enc1 还核对了与原生参考实现相同种子下的公钥、私钥、密文和共享密钥散列。它只证明这些测试输入上的功能行为，**不代表安全评估、完整向量认证或恒定时间保证**。

页底提供 [ngcc.dev](https://ngcc.dev/reports/index.html) 已公开发现的中文详解，当前针对 Aigis-Enc+、Aigis-Sig+ 和 WeaverKEM 共 8 项，分别写出证据、影响边界与修复方向；显示报告所描述的**归档提交源码**状态，改动过的浏览器构建与原报告不是完全相同的二进制。原站截至 2026-09-25 的索引还有大量其他候选报告，本站仅翻译所列 8 项。所有候选都可从页面打开报告索引；未整理中文详解并不表示没有问题。征集候选与现有 PQMagic 算法即使名称相近也不能视为相同实现。

原项目使用的 PQMagic 上游提交记录和许可证副本分别为 `public/pqc-practice/PQMagic-UPSTREAM_COMMIT.txt` 与 `public/pqc-practice/PQMagic-LICENSE.txt`。该页面是独立的静态文档，主页仅负责提供入口；更新 PQMagic 模块时，应同步核对 JS 与 WASM 的配套关系，并保留征集目录功能。
