# 量仔主页

以量仔和奶龙为主角的量子探索网站。当前主页为黑银与冰蓝配色，包含按需加载的 3D 展台、互动故事、角色档案和 PQC 教学页面。

| 路由 | 内容 |
| --- | --- |
| `/` | 量仔／奶龙 3D 展台、章节入口、粒子雕塑与短片 |
| `/storybook` | 11 页动画书、章节切换和逐页旁白 |
| `/archive` | 角色故事与档案 |
| `/pqc-arsenal` | ML-KEM、ML-DSA、SLH-DSA、FN-DSA 的教学交互 |
| `/pqc-practice` | PQC 武器实战：40 组 PQMagic WASM 配置；2026 年国内征集的 119 个候选和 586 个参数实例（含团队成员），其中 80 个候选、325 组参数已登记并收录可运行的提交源码 WASM；密钥封装、签名、密钥交换与哈希在同一工作台选择 |
| `/about` | 项目作者简介 |

技术栈：Next.js App Router、React 19、TypeScript、Vinext/Vite、Cloudflare Worker、Three.js 与 GSAP。武器库的教学交互是概念演示；武器实战页面在浏览器中使用 PQMagic WASM 执行真实算法运算。

## 本地运行

需要 Node.js ≥ 22.13。仓库根目录执行：

```bash
npm ci
npm run dev
npm test
npm run lint
```

`npm test` 包含生产构建、主页现有路由的服务端渲染检查、3D 资源与帧调度检查。构建产物在 `dist/`，不提交到 Git。

开发入口、目录职责、模型生成、素材管理、验证与发布方式见 [DEVELOPMENT.md](./DEVELOPMENT.md)。3D 和动效细节分别见 [docs/liangzai-3d.md](./docs/liangzai-3d.md)、[docs/gsap-motion.md](./docs/gsap-motion.md)，验证台的资源来源见 [docs/pqc-practice.md](./docs/pqc-practice.md)。

`main` 是现有 [wangyibiao.com](https://wangyibiao.com) 的 Cloudflare 部署代码源；`.openai/hosting.json` 属于仓库已有的另一条 Sites 托管配置。
