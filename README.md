# Yibiao · 密码工程与实验

Yibiao 的个人密码工程与实验网站，围绕后量子密码、TLS / TLCP、SSH 与 IKE 展示技术方向，并提供浏览器算法实验、技术笔记与前沿简报。量仔作为站点吉祥物，故事和模型收在「工程之外」。

技术栈：Next.js App Router、React 19、TypeScript、Vinext/Vite、Cloudflare Worker、Three.js 与 GSAP。

## 快速开始

需要 Node.js ≥ 22.13，在仓库根目录执行：

```bash
npm ci
npm run dev
```

开发服务器默认监听 `0.0.0.0`。验证命令、资源维护与部署说明见 [开发指南](DEVELOPMENT.md)。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 真实 ML-KEM 迷你实验、工程实践、协议层图、技术笔记与服务端简报 |
| `/protocols`、`/protocols/{tls,tlcp,ssh,ikev2}` | 协议方案、扩展、报文预算、抗降级与验证边界 |
| `/projects`、`/benchmarks` | 公开 GitHub 作品、TLS/SSH 实测与下载脚本 |
| `/gm-pqc`、`/migration` | 国内候选进度、密码敏捷与部署检查表 |
| `/notes`、`/notes/[slug]` | 原创工程长文与实现记录，附英文摘要和独立 RSS |
| `/lab/hybrid`、`/lab/security` | 真实混合 KEM 与安全 / 隐私 / WASM 来源 |
| `/tools`、`/tools/packet-size`、`/tools/certificates`、`/parameters` | 报文 / 证书预算和参数 CSV |
| `/contact`、`/weekly`、`/records` | 联系、RSS、周报与可核对的公开记录 |
| `/changelog`、`/site-info`、`/.well-known/security.txt` | 维护记录、技术来源与安全联系 |
| `/models` | 量仔／奶龙 3D 模型，支持旋转、缩放、视角切换及图片回退 |
| `/storybook` | 11 页插画故事、章节目录与逐页旁白 |
| `/archive` | 量仔的角色档案 |
| `/pqc-arsenal` | ML-KEM、ML-DSA、SLH-DSA、FN-DSA 的原理与教学交互 |
| `/pqc-practice` | 转到独立 HTML 实验室，执行 WASM 密钥封装、签名、密钥交换与哈希 |
| `/pqc-practice/audit` | 国内征集候选的逐参数接入记录、来源与 CSV 导出 |
| `/news`、`/news/[slug]` | 按日报和分类浏览技术新闻及正文 |
| `/about` | 作者公开经历、工程项目与公开版简历 |
| `/pqc/[algorithm]` | 每种算法的独立参考页 |
| `/en/about`、`/en/pqc`、`/en/lab` | 英文简介、图鉴与实验室 |
| `/universe` | 关于目录下的量仔宇宙 |
| `/sitemap.xml`、`/robots.txt`、`/rss.xml` | 收录与订阅 |

旧 `/observatory` 地址重定向到首页。3D 模型在模型页加载，首页不挂载旧星云展台。

## 算法与数据来源

密码图鉴提供概念教学；实验室使用实际 WASM 运算。NIST 算法组包含 ML-KEM、ML-DSA、SLH-DSA，模块源自 PQMagic；国内征集组使用带来源记录的候选目录和提交实现。功能测试不等于算法安全评估或 FIPS 实现认证。

新增工程数据口径、复现条件与维护方式见 [协议工程说明](docs/protocol-engineering.md)。TLS 与 SSH 已有自建回环实测，TLCP / IKEv2 暂为公开资料分析；自动邮件投递尚未开通。

最新参数接入状态见 [不可运行清单](docs/pqc-unavailable.md)，已发布安全发现见 [报告索引](docs/pqc-security-index.md)。实现来源、适配与验证边界见 [实验室说明](docs/pqc-practice.md)。

新闻前端读取 `https://api.wangyibiao.com`；本地运行前端无需 Cloudflare 密钥或本地数据库。`main` 是 [wangyibiao.com](https://wangyibiao.com) 的 Cloudflare 部署来源，`.openai/hosting.json` 是仓库已有的独立 Sites 配置。

全部专题和历史记录见 [文档索引](docs/README.md)。

导航配置来自 `app/site/navigation.ts`，独立实验室页在构建前由 `scripts/sync-site-shell.mjs` 同步。英文实验室由中文源文件与 `app/site/lab-en.json` 生成，新增文案应同时维护词典。
