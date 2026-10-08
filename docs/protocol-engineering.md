# PQC 协议工程内容维护

路由清单见根 README，常用验证命令见 DEVELOPMENT。本文只说明新增内容的数据契约与测量边界。

## 内容与证据

`app/engineering/` 维护共享页面组件、协议结构、原创笔记、迁移阶段、标准参数、尺寸模型与数据快照。四个协议子页由 `protocols.ts` 驱动，固定包含方案图、扩展、尺寸、抗降级、互通与踩坑。

- TLS / SSH 使用 `public/data/*-benchmarks.json` 的自建回环实测。数据附样本、环境与计时边界。
- TLCP / IKEv2 使用公开标准与实现资料，明确尚无本站公开端到端测试；算法实验不计为协议互通。
- 公司工作只概括为抗量子 TLS/TLCP 协议改造、抗量子算法库，不发布内部案例、部署与数字。
- `projects.json` 是公开 GitHub 快照。fork、分支领先提交与上游合并贡献不得混算；演讲、论文未确认时保留未收录状态。
- 笔记与周报使用各自的静态 RSS，不依赖新闻 API。没有邮件服务时，只提供联系与订阅意向入口，不显示已订阅或投递成功。

## 生成资源

`npm run build` 调用 `scripts/generate-engineering-data.mjs`：

| 输入 | 输出 |
| --- | --- |
| 候选目录、KEM/签名/KEX/哈希映射、JS/WASM 配对 | `app/engineering/candidates.json`、候选参数 CSV |
| NIST 最终标准参数 | `public/downloads/pqc-parameters.csv` |
| 迁移阶段 | Markdown 检查表与空白资产 CSV 模板 |
| 已收录 JS/WASM 字节 | `public/data/wasm-manifest.json`（SHA-256 清单） |

这些输出提交到仓库，开发服务器首次启动也可读取；更新输入后运行生成器并核对差异。文件配对表示已收录，不能替代功能测试或安全报告。清单不是构建证明。

## 实测脚本

TLS 重测需要 Node 24+ 与 OpenSSL 3.5+；前端自身仍支持 Node 22.13+。SSH 重测需要 Linux、OpenSSH 10+、ssh-keygen 与 `/usr/sbin/sshd`。下载脚本不依赖 npm。

```bash
BENCH_SAMPLES=20 node public/downloads/benchmark-protocols.mjs public/data/protocol-benchmarks.json
BENCH_SAMPLES=10 node public/downloads/benchmark-ssh.mjs public/data/ssh-benchmarks.json
```

TLS 代理统计至服务端握手完成的 TLS 字节；不采集 IP 包。纯 PQC 案例同时更换协商组和认证算法，不能隔离 KEM 成本。CA / 主机名校验始终开启。SSH 固定临时测试主机公钥，时间覆盖进程启动至认证后的命令完成。

脚本只启动回环端点，使用临时密钥并在退出时清理；不要用于生产配置生成。SSH 的临时 daemon 在当前容器目录权限下使用 `StrictModes=no`，它仅影响这次文件权限检查，主机密钥验证仍开启。统计失败和不支持的版本，不填造耗时。

## 本地工具与混合 KEM

`size-model.ts` 公开 ClientHello 字段、证书编码和 AES-GCM IKE SKF 的预算公式。模型输入不上传；结果与真实 DER、记录字节、IP 分片分别标注。默认链采用同算法签发模型，真实混合链需逐张计算。

`hybrid-engine.mjs` 复用 ML-KEM-768 WASM，并用 Web Crypto X25519 / HKDF。六步操作只返回公开材料指纹和一致性状态；私钥与秘密留在 Worker。教学组合顺序为 X25519 ss || ML-KEM ss，salt 绑定固定长度 transcript，info 绑定角色和实验版本；**不能当作 TLS 的密钥计划或 X25519MLKEM768 的标准材料排列**。

密文与上下文篡改实验必须出现不一致。完成时覆盖可访问秘密字节，重置时终止 Worker；浏览器内部 CryptoKey 及内存副本不保证清零。实验室安全声明和标准联系文件 `/.well-known/security.txt`由静态资源提供，因为当前 Vinext 扫描器忽略以点开头的 App Router 目录。

## 验证

`tests/engineering.test.mjs` 验证公式边界、真实混合算法、拒绝路径、SSR、独立 RSS 与下载内容。`npm run test:engineering-browser` 使用构建产物覆盖 24 个新增路由的 320 / 1440px 视口，实际操作计算器、筛选、勾选保存和三种混合实验，检查资源与浏览器异常。截图位于忽略目录 `outputs/engineering/`。

两套浏览器脚本共用 `scripts/lib/serve-built-site.mjs`，无需线上部署或新闻 API。`security.txt` 到期前需维护 Contact / Expires / Canonical；自动邮件投递另行接入后再修改页面状态。
