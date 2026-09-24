# PQC 武器实战

页面的完整静态运行资源位于 `public/pqc-practice/`，可从 `/pqc-practice/index.html` 直接打开。量仔主页的 `/pqc-practice` 路径也会转到该页面。

这份页面从 ChatGPT Sites 的“PQC 会话实验室”源码提交 `6397843359f3b1273e1f430abf7aac69e369489e` 原样复制：`index.html`、样式、脚本、字体和 40 组 PQMagic WASM 模块均保留原有相对路径。页面在浏览器的 Web Worker 中运行密钥生成、封装、解封装、签名和验签，数据无需发送到后端。浏览器需支持 WebAssembly 与 Web Crypto。

原项目使用的 PQMagic 上游提交记录和许可证副本分别为 `public/pqc-practice/PQMagic-UPSTREAM_COMMIT.txt` 与 `public/pqc-practice/PQMagic-LICENSE.txt`。该页面是独立的静态文档，主页仅负责提供入口；更新验证台时，应整体同步原项目的 `dist/`，确保 JS 与 WASM 配套。
