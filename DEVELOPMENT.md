# 开发指南

本文说明当前仓库的开发入口和维护流程。页面功能概览见 [README](README.md)，专题说明见 [文档索引](docs/README.md)。

## 环境与命令

使用 Node.js ≥ 22.13 和 npm，在仓库根目录运行 `npm ci`，按锁文件安装依赖。云任务使用 `/workspace/liangzai-homepage` 的现有隔离检出；除非明确要求，不创建额外 Git worktree。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Vite/Vinext 开发服务器 |
| `npm run dev -- --port 5173 --strictPort` | 固定开发端口；端口占用时直接报错 |
| `npm run build` | 限时生产构建，校验 Worker 的 `default.fetch` 和 Sites 清单 |
| `npm start` | 运行已有生产构建 |
| `npm test` | 先构建，再运行全部 `tests/*.test.mjs` |
| `npm run typecheck` | TypeScript 检查 |
| `npm run lint` | 检查手写源码，排除构建产物和生成的胶水代码 |
| `npm run test:layout` | 使用 Chromium、Firefox、WebKit 检查生产页面布局 |

生产产物在忽略目录 `dist/`。`npm test` 已包含构建，无需在它之前重复运行 `npm run build`。全量测试包含真实 WASM 密码运算，耗时高于普通静态检查；不支持的参数明确跳过，不能算作通过。

受限文件系统可使用项目内 npm 缓存：

```bash
npm ci --cache "$PWD/.sites-runtime/npm-cache" --no-audit --no-fund
```

`scripts/sites-env.sh` 为工具提供项目内的缓存、临时目录和 Wrangler 状态目录，现有构建与 lint 命令会使用它。仅需重新校验已有产物时，可以显式通过 Bash 调用：

```bash
bash scripts/sites-env.sh -- bash scripts/validate-artifact.sh
```

前端不需要密钥或本地 D1/R2。新闻读取公共 API，开发环境需允许访问 `api.wangyibiao.com`；采集、发布和管理新闻后端另见 [新闻流程](news/README.md)。

## 代码入口

| 功能 | 主要位置 |
| --- | --- |
| 首页 | `app/page.tsx`、`app/QuantumHome.tsx`、`app/studio/` |
| 模型鉴赏 | `app/models/ModelGallery.tsx`、`gallery-scene.ts` |
| 故事书 | `app/storybook/StoryBook.tsx`、`storyData.ts` |
| 角色档案与作者简介 | `app/archive/`、`app/about/` |
| 密码图鉴 | `app/pqc-arsenal/ArsenalLab.tsx` |
| 密码实验室与接入记录 | `public/pqc-practice/`；`app/pqc-practice/page.tsx` 负责重定向 |
| 新闻列表与正文 | `app/news/`；首页简报位于 `app/studio/HomeDispatch.tsx` |
| 新闻后端 | `news-worker/`；日报 JSON 与验证器位于 `news/` |
| Worker 与构建 | `worker/index.ts`、`vite.config.ts`、`build/` |

`app/layout.tsx` 装配导航、动效、转场和共享样式。`app/experience/destinations.ts` 维护 React 导航名称与搜索入口；独立实验室和接入记录使用自己的 HTML 导航，调整入口时同步核对。

共享视觉由 `app/studio/system.css`、`public/assets/site-typography.css`、`public/assets/site-navigation.css` 和 `public/theme/` 管理，各页面 CSS 负责局部布局。主题和响应式规则见 [布局与主题](docs/layout-themes.md)，转场生命周期见 [动效说明](docs/gsap-motion.md)。

`/observatory` 仅保留重定向。资源目录中的 `observatory` 名称仍供模型页和转场使用，不表示原观测站页面仍在运行。

## 资源维护

| 资源 | 维护入口 |
| --- | --- |
| 角色模型分片与 WebP 回退 | `public/assets/models/observatory/`、`app/experience/three/model-catalog.json` |
| 故事插图与旁白 | `public/assets/book-v2/`、`book-v3/`、`narration-v3/`；以 `storyData.ts` 引用为准 |
| 角色、算法与首页图片 | `public/assets/characters-v2/`、`pqc/`、`cinematic/` |
| 新闻后备配图 | `public/news-covers/`、`app/news/keyword-cover.ts` |
| 实验室 JS/WASM 与来源记录 | `public/pqc-practice/` |

更新模型的命令及校验流程见 [模型说明](docs/liangzai-3d.md)。清理资源前同时检查 JSX/CSS/JSON 引用、模型清单和动态路径；回退图采用 `${mode}-${view}.webp`，不能仅凭全文搜索判定文件无用。带哈希的旧分片可能仍被已打开的页面使用。

故事改页序时同步调整插图、旁白和章节导航；保留用户触发播放的行为。算法更新时保留实现来源、许可证、JS/WASM 配对及逐参数状态，不把编译成功描述为安全认证。

以下命令从当前数据快照重新生成两份算法文档：

```bash
node scripts/generate-pqc-availability.mjs
node scripts/generate-pqc-security-index.mjs
```

`build/about-push-assets.ts` 在开发和构建时生成独立 HTML 页使用的转场包，输出到忽略目录 `public/pqc-practice/about-push/`；修改共享转场后重新启动开发服务。

## 验证

常规代码变更执行：

```bash
npm run typecheck
npm run lint
npm test
git diff --check
```

只改文档时检查链接、命令、数据来源与 Git 差异即可。测试覆盖 SSR 路由、模型分片与贴图、动效生命周期、新闻渲染、目录数据及真实密码运算。定向测试需构建产物时，先运行一次 `npm run build`。

布局变更还应执行浏览器检查。先安装所需浏览器及 Linux 系统依赖，再构建并运行：

```bash
npx playwright install --with-deps chromium firefox webkit
npm run build
npm run test:layout
```

该脚本用已提交的新闻日报作固定数据，覆盖十类页面和 320～3840px 视口，截图写入 `outputs/responsive/`。它不依赖新闻后端在线，也不替代真实设备的 WebGL、视觉及辅助技术检查。

人工检查重点：模型切换／缩放／图片回退、故事翻页与音轨、完整 ML-KEM 往返、新闻分类与返回、主题切换不重置实验室、目录和弹窗焦点、减少动态效果、资源 404 与 hydration 错误。

## 部署

`main` 是 `wangyibiao.com` 的现有 Cloudflare 部署来源。提交前核对分支及远端状态，部署后检查首页和受影响路由；推送成功本身不能证明部署完成。

`.openai/hosting.json` 属于独立 Sites 配置，保留现有项目标识。新闻 Worker/D1 的部署和管理凭据要求见 [新闻流程](news/README.md)，普通前端启动无需这些凭据。
