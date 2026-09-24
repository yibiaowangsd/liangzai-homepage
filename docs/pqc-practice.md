# PQC 武器实战

页面的完整静态运行资源位于 `public/pqc-practice/`，可从 `/pqc-practice/index.html` 直接打开。量仔主页的 `/pqc-practice` 路径也会转到该页面。

这份页面以 ChatGPT Sites 的“PQC 会话实验室”源码提交 `6397843359f3b1273e1f430abf7aac69e369489e` 为基础，保留 40 组 PQMagic WASM 模块及其本地密钥生成、封装、解封装、签名和验签流程，并添加了算法库选择和征集候选目录。原页面底部的快速自检已移除。可运行流程在浏览器的 Web Worker 中执行，数据无需发送到后端。浏览器需支持 WebAssembly 与 Web Crypto。

`ngcc-catalog.json` 快照取自 [ngcc-harness](https://github.com/ngcc-dev/ngcc-harness) 提交 `c5261784ef27e7363b1bbace3d687932fda35ccd` 的 `downloads.csv` 和 `data/parameters.csv`，按官方候选编号列出 41 个 KEM、34 个签名、9 个密钥交换及 35 个哈希候选，合计 119 个候选、586 个实现参数实例。每项提供官方候选页、提交源码包、实例参数与参考实现目录。数据可用 `python3 scripts/generate-ngcc-catalog.py /path/to/ngcc-harness` 重新生成；候选数量改变时生成脚本会要求人工核对。

征集目录是资料浏览模式，**目前不执行这些候选的参考实现**。征集候选（如 Aigis-Enc+ / Aigis-Sig+）与现有 PQMagic 算法不能仅凭相近名称视为相同实现。接入某一候选时需分别适配其 API、编译独立的浏览器模块，并核对向量、内存边界及验证行为；不能把目录项冒充可运行验证。

原项目使用的 PQMagic 上游提交记录和许可证副本分别为 `public/pqc-practice/PQMagic-UPSTREAM_COMMIT.txt` 与 `public/pqc-practice/PQMagic-LICENSE.txt`。该页面是独立的静态文档，主页仅负责提供入口；更新 PQMagic 模块时，应同步核对 JS 与 WASM 的配套关系，并保留征集目录功能。
