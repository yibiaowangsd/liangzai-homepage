# 量仔主页开发文档

适用仓库：[`yibiaowangsd/liangzai-homepage`](https://github.com/yibiaowangsd/liangzai-homepage)。本文根据 2026-09-24 的 `main` 代码整理；接手时仍以仓库最新代码为准。

## 1. 站点结构

| 页面 | 入口 | 关键实现 |
| --- | --- | --- |
| `/` | `app/page.tsx` | `app/QuantumHome.tsx`、`app/experience/InteractiveGuardian.tsx`、`QuantumSculpture.tsx` |
| `/storybook` | `app/storybook/page.tsx` | `StoryBook.tsx` 负责翻页与旁白，`storyData.ts` 负责页面和音轨路径 |
| `/archive` | `app/archive/page.tsx` | 角色档案和战后内容 |
| `/pqc-arsenal` | `app/pqc-arsenal/page.tsx` | `ArsenalLab.tsx` 的算法数据与交互；`cinematic-arsenal.css` 调整暗色视觉 |
| `/about` | `app/about/page.tsx` | 作者简介；只使用已公开且确认的信息 |

`app/layout.tsx` 加载全局样式，并装配 `ExperienceProvider`、全站导航及页脚。`app/experience/Motion.tsx` 管理 GSAP、系统减少动态效果与手动暂停。样式分工：`app/globals.css` 保留基础变量及 PQC 组件基础样式；`app/experience/cinematic.css` 为全站暗色视觉；`app/experience/guardian-3d.css` 为展台；各页面目录的 CSS 为页面局部样式。修改样式时注意 PQC 暗色样式会覆盖部分基础规则。

首页的 3D 场景在客户端动态加载 `app/experience/three/hero-scene.ts`；其中 `character-assets.ts` 按 `model-catalog.json` 读取当前角色模型分片、校验长度并以 GLTFLoader/MeshoptDecoder 解析。`render-scheduler.ts` 合并重绘请求，暂停或离屏时停止连续绘制。加载失败时 `InteractiveGuardian.tsx` 显示对应模式与视角的 WebP 预览。

## 2. 环境和命令

Node.js ≥ 22.13，推荐使用锁文件安装：

```bash
npm ci
npm run dev
```

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | Vite/Vinext 开发服务器；默认监听 `0.0.0.0` |
| `npm run build` | 限时 Vinext 构建，并校验 Worker 入口及 Sites 清单 |
| `npm test` | 构建后运行 `tests/*.test.mjs` |
| `npm run lint` | 检查手写源码（含 `build/`）；排除构建产物、转场生成包及 Emscripten 胶水代码 |
| `npm run typecheck` | TypeScript 静态类型检查，不生成 JS |
| `npm run validate:artifact` | 单独校验 `dist/server/index.js` 和 `dist/.openai/hosting.json` |
| `npm run models:prepare -- <量仔.glb> <奶龙.glb>` | 从原始模型生成压缩分片与清单 |
| `npm run models:prepare -- --refresh-textures` | 从现有分片重建 Web 贴图，不需要原始模型 |

`npm run install:ci` 与 `scripts/sites-env.sh` 是已有 Sites 环境辅助；普通开发直接运行 `npm ci`。`worker/index.ts` 是 Worker 入口，处理 Vinext 请求与可选图像优化。`vite.config.ts` 同时配置 Vinext、Cloudflare 和 Sites 打包插件；`.openai/hosting.json` 中的 `project_id` 是已有 Sites 项目标识，不要随意替换。当前业务没有数据库，也没有 D1 绑定。

## 3. 资源与模型

| 资源目录 | 当前用途 |
| --- | --- |
| `public/assets/models/observatory/` | 两个角色的压缩模型分片、单人及双人模式的四视角 WebP 预览 |
| `public/assets/book-v2/`、`book-v3/` | 故事书与首页实际引用的插图；修订过的页由 v3 文件覆盖 |
| `public/assets/narration-v3/` | `storyData.ts` 中 11 个逐页音轨 |
| `public/assets/characters-v2/` | 首页、角色档案、武器库和简介页图片 |
| `public/assets/pqc/` | 武器库的四张算法配图 |
| `public/assets/cinematic/` | 首页量子门场景 |

模型清单既记录原始 GLB 的来源校验值，也记录部署分片的哈希、长度与贴图规格。编辑模型时，重新生成 `model-catalog.json` 与分片并运行 `tests/character-assets.test.mjs`；不要仅改文件名或删掉仍在清单中的分片。WebP 回退图的路径由 `${mode}-${view}.webp` 动态拼接，`mode` 为 `liangzai`、`nailong`、`duo`，`view` 为 `front`、`side`、`back`、`reset`，因此不能只凭全文搜索判断它们无用。

新增或更换故事素材时，更新 `app/storybook/storyData.ts`、对应页面和测试。资源清理时先检查 JSX/CSS/JSON 中的完整 `/assets/...` 路径，再检查动态模板、模型清单和测试。不要把当前版本的资源重新改成无哈希的旧路径。故事旁白从用户触发的播放动作开始。

2026-09-24 清理记录：删除不再挂载的旧 `app/home/` 与其 CSS Module、未启用的 D1/Drizzle 与认证示例，以及 41 个无现用路由引用的旧图片、旁白和上一版模型分片；公开素材目录减少约 22.4 MiB。Git 历史仍可找回这些版本。旧版本已打开的浏览器页如果继续请求刚删除的哈希分片，可能需要刷新页面以加载新清单。

## 4. 页面行为与维护点

- 首页初始显示量子星云，自动加载量仔模型作为粒子采样目标但隐藏实体。长按约 4 秒，粒子沿螺旋轨迹凝聚为真实模型表面；松开未完成的长按会回散，轮廓锁定后约 1.3 秒自动凝实。奶龙使用暖金星云，双人模式同时凝聚两个角色。出场后保留点击身体部位互动、拖动旋转和四视角选择，移除独立动作按钮。仅加载选中的角色；WebGL 不可用或加载失败时切换预览图。场景参数、资源预算和验证细节见 [docs/liangzai-3d.md](docs/liangzai-3d.md)。
- GSAP 动效跟随系统减少动态效果，另有全站暂停按钮。离屏、后台和暂停状态不能保持无意义的渲染循环。组件卸载时释放动画、事件监听和 Three.js 资源。参考 [docs/gsap-motion.md](docs/gsap-motion.md)。
- `ArsenalLab.tsx` 的四种算法和参数集中在组件的数据数组中；新增算法时同步处理类型、切换状态、界面与来源说明。教学评分不能表述为实测性能或正式安全结论。
- 故事书的插图与音轨按 `storyData.ts` 的页序关联；改页序时同时核对旁白、章节跳转和页面测试。
- 图片保留准确替代文本，交互用真实按钮；动效暂停、键盘控制及语义状态不可因视觉调整而丢失。

## 5. 验证与发布

修改完成后执行：

```bash
npm test
npm run lint
git diff --check
```

测试覆盖首页及四个子路由的 SSR、PQC 内容、故事书、Worker 的 GSAP 计时器边界、模型分片哈希与解码、贴图规格、双角色站位、回退预览图和帧调度。页面交互或视觉调整还应在浏览器检查：五条路由、三种模型模式、视角切换、键盘与拖动、WebGL 回退、故事翻页与音轨、动效暂停、算法切换，以及控制台中是否有资源 404 或 hydration 报错。桌面为主要体验，窄屏仍应可访问。

`main` 是 `wangyibiao.com` 的现有 Cloudflare 部署来源。提交到 GitHub 前确认当前分支与远端最新状态，切勿强推；推送后检查构建结果、站点首页和受影响路由。GitHub 更新并不等于 Cloudflare 已完成部署。`.openai/hosting.json` 对应独立 Sites 配置，不要为了更新主域名而创建或替换 Sites 项目。

### 星云出场维护

- `arrival-state.ts` 管理可撤销的长按、不可撤销的最终凝实及切换重置；键盘按住空格或回车可触发同一流程。
- `nebula.ts` 按三角形面积采样原模型表面（单人 18,000 粒子，双人各 12,000），顶点着色器完成聚拢；每帧不遍历更新粒子位置。原始 PBR 材质通过高度扫描与抖动溶解显现，不修改原模型资源。
- 出场阶段短时允许 60 FPS，待机使用 30 FPS、受限 DPR 与半分辨率 Bloom。离屏/后台停止绘制并释放长按；关闭动效时停止星云自转并取消强光和镜头推进，主动长按仍可完成凝聚。切换角色与卸载释放粒子几何和材质。
- `tests/arrival.test.mjs` 检查长按回退、锁定后完成、后台时间步限制和模型坐标采样；首页渲染检查初始星云提示及动作按钮移除。


### 天体与融合维护

- `celestial.ts` 管理星云中的恒星、行星、天然与人造卫星、彗星；跟随出场进度淡出。
- 星云指针按真实路径记录最多 6 段局部尾迹，出生时间固定，0.34 秒内衰减；交互期间目标 60 FPS。柔雾采用预生成噪声纹理，初始阶段关闭 Bloom。调度器用连续截止时间避免限帧取整卡顿。
- 双人出场后继续长按约 2 秒，`fusion-state.ts` 驱动全屏融合；4.2 秒序列后显示 `fusion-model.ts` 独立的靓龙模型。拖动取消蓄力，返回或 Escape 复原双人，组件保留同一个 WebGL 上下文。
- `tests/fusion.test.mjs` 验证融合时序、模型几何、粒子采样与天体生命周期。视觉及帧率仍需在真实 WebGL 浏览器设备上复核。


### 星云状态与局部交互修复

- 出场状态按量仔 / 奶龙 / 双人分别记忆，禁止在切换中无条件重置；出场和融合完成后保留模型及约 3 秒余辉。
- 鼠标只影响 1.25 单位半径内粒子，不能再添加全场指针平移。量仔为交叉椭圆轨道，奶龙为厚实弯曲云柱。
- 天体采用初始化时生成的无接缝表面贴图和细分曲面，太阳能电池格用实例化减少绘制调用。
- 自动 LED 眨眼和天线触发全环蓝光已移除；曝光固定，保留明确点击动作。合体模型更新等待用户选定新三视图。


### 已确认 A2 合体模型

- `fusion-model.ts` 现为用户选定的 A2：复用原量仔头部几何、独立材质，搭配圆肚金色龙身、浅色肚皮、短腿和渐细厚尾。
- 自动眨眼已恢复到量仔与合体模型，只影响眼部。
- `fusion-state.ts` 的 `docked` 表示关闭全屏后保留在首页的合体结果；不可在返回或切换模式时重置已完成融合。完成后的蓄力不能再拦截正常点击。


### 关于我进入转场

`app/experience/AboutPushTransition.tsx` 统一接管站内普通点击的 `/about` 链接，保留 Ctrl/Command 点击、新窗口和当前页链接的原有行为。`about-push.ts` 冻结离开页当前视口，等待关于我路由就绪，再用约 3 秒的同一时间轴驱动页面边缘、量仔位置和关节发力。首页通过 `liangzai:snapshot` 事件即时复制 WebGL 帧，不开启永久保留绘图缓冲。

量仔脚底以屏幕下沿为地面，每帧根据鞋底包围盒校正落地高度；手掌与页面边缘动态对齐。左右手错峰接触，停稳蓄力后再推出，步态由页面位移驱动，并叠加踝关节缓冲、轻微重心变化与头部/天线跟随。

角色来自现有量仔模型，`three/about-push-scene.ts` 使用短生命周期透明画布，按需加载、结束释放，没有新增常驻渲染循环。跳过按钮、Escape、返回、窗口尺寸变化、后台切换和加载超时均会清理遮罩；系统减少动态效果或站内动效关闭时直接导航。

密码实验室及接入记录页独立于 React 路由，使用 `about-push-static.ts` 播放量仔推走当前页，再进行一次顶层导航。不得使用 iframe 预览后再跳转，以免关于我加载并入场两次；跳转等待期隐藏旧内容，BFCache 返回时恢复。`build/about-push-assets.ts` 在 Vite 开发/构建时生成其 JS/CSS 到 `public/assets/about-push/`，该目录无需手工提交。修改共享转场后重新启动开发服务即可同步独立 HTML 页面所用产物。


### 2026-09-27 代码整理与运行开销优化

- 首页 2D 氛围、粒子雕塑与 3D 展台复用 `three/render-scheduler.ts` 的调度规则（各画布仍有独立调度实例）。雕塑待机为 30 FPS，指针交互、冲击波及形态切换为 60 FPS；离屏/后台暂停，关闭动效后仅按需重绘。GSAP 形态插值只标记重绘，不再绕过可见性直接绘制。
- `sculpture-particles.ts` 集中维护粒子的固定形态、投影及深度排序。球、环、波形坐标在初始化时计算，帧内复用 780 个粒子对象；旋转三角函数提到循环外。`sculpture-particles.test.mjs` 与原公式对照所有粒子及中间变形，确保坐标、排序与交互物理状态保留。
- 场景销毁立即中止尚未完成的模型请求；释放 `InstancedMesh` 自身缓冲，按图像源去重关闭共享 ImageBitmap。相机投影矩阵只在缩放实际变化时更新，尺寸变化仍正常更新。
- 导航移除没有对应路由的 `.html` 重复分支，名片回首页使用路由 Link。格式化调整集中在本次修改的 2D 动画与导航文件。
- 新增 `npm run typecheck`，补齐 Worker 静态资源接口类型，忽略 TypeScript 增量缓存。ESLint 不再扫描生成的 WASM 胶水/转场文件，并重新覆盖手写 `build/` 源码；原有三个 lint 错误已修复。
- 原全量测试将运行清单中 24 个显式 `null` 槽错误导入为 `null.mjs`。现在这些槽明确标记 skipped，并增加独立检查：必须有非 verified 的构建记录；任何已声明可运行的模块仍执行原有真实密码运算。该调整不新增算法可用性，也不将未运行的算法计作通过。

本次本地微基准：780 粒子的坐标投影与排序，预热 1,000 轮，5 组各 5,000 轮取中位数；Node.js 24.19.0 下由约 0.169 ms/轮降到 0.049 ms/轮（约 71%）。这是纯计算路径结果，不代表整页 FPS、GPU 开销或首屏时间的同比改善。

验证记录见本次 PR。真实浏览器视觉检查受 Chromium 下载失败限制，发布前仍应复核形态切换、暂停/恢复、滚动离屏及返回、角色切换、融合与关于我转场。


### 星云快速划过与页面入场（2026-09-27）

- `three/nebula-wake.ts` 记录真实指针路径段。渲染帧不移动路径端点、不刷新出生时间；离开再进入和长间隔输入不会跨屏补线。尾迹在 0.34 秒内自然消退，所有角色模式共用这一规则。
- GPU 扰动使用路径段的局部距离，重叠力归一化，位移限制在 0.24 世界单位；柔雾只接受 6% 的扰动，避免快速扫过时大片云雾一起鼓动。鼠标停下后不再维持一个不断追赶、膨胀的力场。
- `celestial.ts` 根据唤醒进度让恒星、两颗行星轻微偏转，星环倾转，天然卫星推进公转、通信卫星轻抬、彗星短暂提速。实体不挤压变形；提前松手时按原唤醒状态回退。关闭动效时不添加该位移。
- `PageArrival.tsx` 负责 React 路由的 560 ms 内容轻微上浮（12 px，透明度 0.86→1）；`page-arrival.ts` 同时用于密码实验室和接入记录独立 HTML 页。关于我和实验室重定向中间页不播放。不再向已经绘制的页面追加全屏幕布；只随路由启动，使用已提交的 React pathname（layout effect 时浏览器地址栏可能仍为旧路径），动效开关不会重播。标题与首屏内容不再叠加 SplitText / GSAP 隐藏入场，滚动渐入仅用于屏幕下方尚未出现的内容。快速换页、后台切换、页面卸载、关闭动效时清理动画，减少动态效果和已保存暂停设置下直接显示内容。
- 全站导航对独立密码实验室使用普通文档跳转，避免 RSC 预取重定向到 `index.html.rsc` 的无效请求。
- `tsconfig.json` 允许显式 `.ts` 导入，以便共用状态模块能同时被 Vite 和现有 Node 类型剥离测试加载；TypeScript 仍保持 `noEmit`。
