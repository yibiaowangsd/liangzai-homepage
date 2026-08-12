# 量仔主页开发与接手手册

> 适用仓库：`yibiaowangsd/liangzai-homepage`  
> 主要公开站点：<https://wangyibiao.com>  
> 本文目标：让新的开发者或新的 AI 对话只阅读这一份文档，就能安全、快速地继续开发。

## 1. 新对话接手时先做什么

把下面这段直接发给新的开发对话即可：

```text
请先完整阅读仓库根目录 DEVELOPMENT.md，再开始修改。
以 origin/main 最新提交为准，先检查 git status 和最近提交，不要覆盖已有改动。
保持 Minimal Zine 纸感视觉体系，复用现有量仔原图，不要重新生成或拉伸量仔。
修改后至少执行 npm run build 和 node --test tests/rendered-html.test.mjs；
如果需要发布，先说明改动范围，再提交到 GitHub，并确认 Cloudflare 部署结果。
```

建议接手顺序：

1. 阅读本文和 `README.md`。
2. 检查 `git status -sb`，确认没有来源不明的本地修改。
3. 执行 `git fetch origin`，确认当前分支与 `origin/main` 的关系。
4. 只阅读与任务相关的页面、样式和素材，不做无关的全仓库重构。
5. 修改后完成构建、测试、视觉检查，再决定是否发布。

编写本文时，页面业务基线为提交 `40fd826`（PQC 武器库 Hero 简化版）。接手时不要固定依赖该提交，应始终以最新 `origin/main` 为准。

---

## 2. 项目定位

这是一个以公司吉祥物“量仔”为主角的 Minimal Zine 风格网站，目前包含两个主要页面：

| 路由 | 页面 | 作用 |
| --- | --- | --- |
| `/` | 量仔档案主页 | 介绍量仔、奶量同盟、反 Shor 故事和战后日常 |
| `/pqc-arsenal` | PQC 武器库 | 面向初学者讲解 ML-KEM、ML-DSA、SLH-DSA、FN-DSA，并提供交互式参数和选型说明 |

网站同时保留两类托管相关配置：

- GitHub `main` 分支是当前 Cloudflare 自动部署的代码源，公开主域名为 `wangyibiao.com`。
- `.openai/hosting.json` 对应 ChatGPT Sites 项目，README 中的 `chatgpt.site` 地址属于另一条托管链路。

不要混淆两条部署链路。若任务明确要求更新 `wangyibiao.com`，核心动作是更新 GitHub `main` 并检查 Cloudflare 部署；不要为了这个目标擅自创建新的 Sites 项目或修改 `project_id`。

---

## 3. 技术栈与运行条件

| 项目 | 当前实现 |
| --- | --- |
| 框架 | Next.js App Router 16.2.6 |
| UI | React 19.2.6 + TypeScript |
| 构建 | Vinext 0.0.50 + Vite 8 |
| 部署运行时 | Cloudflare Worker |
| 样式 | 全局 CSS + Tailwind CSS 导入，页面主体仍以手写 CSS 为主 |
| 数据库 | Drizzle/D1 脚手架已保留，但当前业务未使用数据库 |
| Node.js | `>= 22.13.0` |

当前仓库没有提交 `package-lock.json`，普通本地环境使用：

```bash
npm install
npm run dev
```

不要直接把 `npm ci` 当作默认安装命令；没有锁文件时它会失败。`scripts/install-ci.sh` 是 Sites 环境脚手架的一部分，并假设存在锁文件，普通接手开发不需要优先调用它。

---

## 4. 目录与文件职责

```text
liangzai-homepage/
├── app/
│   ├── layout.tsx                 # 全站 metadata、favicon、全局样式入口
│   ├── page.tsx                   # 量仔档案主页
│   ├── globals.css                # 两个页面的主要样式，避免无关的大范围重写
│   ├── pqc-arsenal/
│   │   ├── page.tsx               # PQC 页面 metadata 与组件入口
│   │   └── ArsenalLab.tsx         # PQC 数据、交互状态与完整页面结构
│   └── chatgpt-auth.ts            # ChatGPT Sites 认证辅助，当前公开页面未使用
├── public/
│   ├── assets/story/              # 量仔主页和故事图片
│   ├── assets/pqc/                # PQC 武器库算法图片
│   ├── assets/spritesheet.webp    # 量仔动画精灵图
│   └── favicon.svg
├── tests/rendered-html.test.mjs   # Worker 产物与两个路由的基础测试
├── worker/index.ts                # Vinext 的 Cloudflare Worker 入口
├── scripts/
│   ├── build-verified.sh          # 有超时保护的构建入口
│   ├── validate-artifact.sh       # 校验 Worker ESM 入口与 hosting manifest
│   ├── install-ci.sh              # Sites 环境安装脚本，普通本地开发慎用
│   └── sites-env.sh               # Sites 隔离环境辅助
├── vite.config.ts                 # Vinext、Sites、Cloudflare 插件及预览 host 配置
├── next.config.ts                 # Next.js 配置，目前基本为空
├── package.json
└── .openai/hosting.json           # 已有 Sites 项目标识，不要随意改动
```

### 修改任务与入口文件对应关系

| 要修改的内容 | 优先查看 |
| --- | --- |
| 首页故事、标题、章节 | `app/page.tsx` |
| 首页与全站纸张风格 | `app/globals.css` 中 PQC 注释之前的部分 |
| PQC 算法文字、参数、状态 | `app/pqc-arsenal/ArsenalLab.tsx` 中 `weapons` 数组 |
| PQC Hero 四张算法图 | `heroWeapons` 数组、`public/assets/pqc/` |
| PQC 交互行为 | `ArsenalLab()` 内的 `selected`、`levelIndex`、`demo` |
| PQC 页面布局 | `app/globals.css` 中 `/* PQC arsenal */` 后的选择器 |
| 页面标题与 SEO 描述 | 对应目录下的 `page.tsx` 或根 `layout.tsx` |
| Cloudflare Worker 行为 | `worker/index.ts`，非必要不要改 |

---

## 5. 页面结构

### 5.1 首页 `/`

首页由以下部分组成：

1. 档案式导航栏。
2. 量仔 Hero。
3. 生平与角色能力。
4. 奶量同盟与反 Shor 故事。
5. 可展开的战后记录。
6. 战后日常与页脚。

主要故事素材位于 `public/assets/story/`。文件名已包含内容哈希，例如：

- `hero-1ee8364c.png`
- `origin-19fddd6b.png`
- `alliance-0fea97ac.png`
- `battle-cdc1056a.png`
- `after-56273bc8.png`

不要把页面引用改回没有哈希的旧文件名，否则 Cloudflare/CDN 可能继续返回旧图片，或在部署时出现新旧文件不一致。

### 5.2 PQC 武器库 `/pqc-arsenal`

PQC 页面主要分为：

1. Hero：左侧标题，右侧“一张量仔 + 四张算法照片”。
2. 从零开始：解释 KEM 与数字签名的区别。
3. 四件武器：算法 Tab、原理、用途、注意事项和规格滑块。
4. 如何选择：按任务推荐算法。
5. 标准来源和页脚。

`ArsenalLab.tsx` 中的关键数据结构：

- `WeaponId`：四种算法的稳定内部 ID。
- `Weapon`：算法的完整展示字段。
- `weapons`：算法内容的唯一主要数据源。
- `heroWeapons`：Hero 四张照片与标签的映射。
- `scoreNames`：相对能力评分的中文名称。

交互状态：

- `selected`：当前选中的算法。
- `levelIndex`：当前参数规格。
- `demo`：KEM 与签名演示切换。

新增算法时，至少要同步检查：类型、`weapons` 数组、Hero 是否需要展示、Tab 网格、测试和移动端布局。不要只增加一段 JSX。

---

## 6. 视觉规范

### 6.1 固定视觉语言

项目当前使用 Minimal Zine / 纸张档案风格：

- 暖灰或象牙纸背景。
- 可见但克制的纸张纤维、扫描颗粒和印刷误差。
- 大面积留白。
- 青色作为主要高饱和强调色。
- 中文宋体/衬线字体与英文等宽小字组合。
- 细边框、档案编号和小型注释可以使用，但不应堆叠成复杂拼贴。

全局颜色和字体变量位于 `app/globals.css` 的 `:root`：

```css
--paper
--ink
--muted
--cyan
--cyan-dark
--milk
--rule
--font-sans-cn
--font-serif-cn
--font-mono-en
```

新增颜色时优先复用这些变量。除非整个页面主题需要调整，不要在多个组件里散落近似色值。

### 6.2 PQC Hero 的强制约束

这是最容易被后续修改破坏的区域，必须保持：

- 右侧只有一个量仔主体。
- 量仔旁边是四张互不遮挡的算法卡片。
- 不再添加悬浮圆章、额外武器线稿、重复网格、旋转纸片或多层投影。
- 不把量仔和算法图合成为一张新图。
- 不用生成式模型重新绘制量仔，避免五官、天线和身体比例漂移。
- 量仔图片使用 `object-fit: contain`，保持完整比例。
- 桌面端为量仔与算法卡片并排；移动端改为上下排列。

当前量仔源文件：

```text
public/assets/story/liangzai-cutout-af7e8ddc.png
```

该文件是 1024×1536 RGBA 透明图片，是当前 Hero 的量仔形象基准。不要用截图或带纸张背景的 Hero 图替换它。

### 6.3 四张 PQC 算法照片

当前文件：

```text
public/assets/pqc/ml-kem-zine-030d4365.webp
public/assets/pqc/ml-dsa-zine-be7db444.webp
public/assets/pqc/slh-dsa-zine-eb6100ca.webp
public/assets/pqc/fn-dsa-zine-97a2ab35.webp
```

素材规范：

- 页面使用尺寸为 640×1067 WebP，约 3:5。
- 单张图约 80% 留白，只保留一个算法视觉隐喻。
- 青色是唯一主要高饱和色。
- 不在图片内生成算法名称；名称由 HTML 输出，保证可读性和无障碍。
- ML-KEM：晶格护盾。
- ML-DSA：晶格印章。
- SLH-DSA：哈希树杖。
- FN-DSA：猎隼轻刃。

替换图片时采用内容哈希文件名：

```text
<meaningful-name>-<sha256前8位>.webp
```

推荐流程：

1. 生成或编辑原始 PNG。
2. 人工检查主体、留白、文字污染和重复物体。
3. 转换为适合网页的 WebP。
4. 计算内容哈希并写入文件名。
5. 更新 `heroWeapons` 中的路径。
6. 保留旧文件到新版本验证完成；确认无引用后再单独清理。

---

## 7. 响应式与无障碍要求

主要断点：

- `980px`：桌面双栏逐步转为单栏，PQC Tab 改为两列。
- `640px`：移动端布局、字号、卡片间距和交互面板进一步压缩。

修改后至少检查：

- 1440px 左右桌面宽度。
- 1024px 左右窄桌面/平板宽度。
- 390px 左右手机宽度。

无障碍约束：

- 页面图片必须有准确 `alt`。
- 装饰元素使用 `aria-hidden="true"`，不要让读屏器朗读无意义图形。
- Tab 保留 `role="tablist"`、`role="tab"` 和 `aria-selected`。
- 交互按钮必须使用真实 `<button>`，不要用可点击 `<div>`。
- 算法名称不要只存在于图片中。
- 焦点状态、文字对比度和触摸区域不能因视觉优化而删除。

---

## 8. 内容与 PQC 数据更新规则

算法参数集中在 `weapons[].levels`，不要把同一组参数复制到多个 JSX 区域。

当前页面定位是“初学者可理解的教学展示”，写作要求：

- 先说算法解决什么任务，再解释数学基础。
- KEM 与数字签名必须明确区分。
- 避免把 KEM 描述为直接加密长消息。
- 性能评分是相对教学展示，不应写成正式基准结论。
- FN-DSA 页面当前明确标注“尚未定稿”，相关参数为近似展示。

如果更新标准状态、算法 ID 或参数，必须优先核对 NIST 官方标准/草案，并同步修改：

1. `weapons` 数组的 `code`、`status`、`principle`、`levels`。
2. 页面底部资料说明与链接。
3. 可能受影响的测试或描述。

不要仅根据二手博客更新标准状态。

---

## 9. 本地开发、构建与测试

### 9.1 启动开发环境

```bash
npm install
npm run dev
```

默认由 Vite/Vinext 启动。`vite.config.ts` 已包含：

- `host: "0.0.0.0"`
- `allowedHosts: ["terminal.local"]`
- Vinext 插件
- Sites 插件
- Cloudflare Vite 插件

除非有明确的预览兼容问题，不要改端口、移除 `terminal.local` 或把 `dev` 改回 `vinext dev`。

### 9.2 必做验证

```bash
npm run build
node --test tests/rendered-html.test.mjs
```

也可一次执行：

```bash
npm test
```

当前测试应包含两项：

1. 首页输出 `codex-preview=development` metadata。
2. `/pqc-arsenal` 成功渲染，并包含四种算法名称。

建议同时执行：

```bash
npm run lint
git diff --check
```

若 `npm run build` 成功，应生成并验证：

```text
dist/server/index.js
dist/.openai/hosting.json
```

其中 Worker 模块必须提供 ESM 默认导出和可调用的 `fetch(request, env, ctx)`。

### 9.3 页面修改后的检查清单

- `/` 返回 200。
- `/pqc-arsenal` 返回 200。
- 四张 PQC 图片路径存在且可以加载。
- 量仔没有被裁切、压扁或横向拉伸。
- Hero 没有出现重复背景、重复人物或卡片互相覆盖。
- 四个算法 Tab 均可切换。
- 参数滑块在每种算法下不会越界。
- KEM/签名演示按钮可以切换。
- 手机宽度没有横向滚动条。
- 控制台没有图片 404 或 hydration 错误。

---

## 10. GitHub 与 Cloudflare 发布流程

### 10.1 开始修改前

```bash
git status -sb
git fetch origin
git log --oneline --decorate -5 origin/main
```

如果工作区存在与当前任务无关的修改，不要执行 `git add -A`，也不要用 `git reset --hard`、`git checkout --` 等命令覆盖它们。

推荐在新分支开发：

```bash
git switch main
git pull --ff-only origin main
git switch -c agent/<简短任务名>
```

如果用户明确授权直接更新 `main`，仍需先确认远端没有新增提交，并使用正常的快进推送；不要强推 `main`。

### 10.2 提交前

```bash
npm run build
node --test tests/rendered-html.test.mjs
git diff --check
git status --short
git diff --stat
```

只暂存当前任务文件，提交信息保持简短，例如：

```text
docs: add development handoff guide
fix: simplify PQC armory hero
feat: add PQC comparison section
```

### 10.3 发布后

GitHub `main` 更新会触发 Cloudflare 自动部署。发布后应检查：

1. GitHub `main` 是否指向预期提交。
2. Cloudflare 构建是否成功。
3. `https://wangyibiao.com/` 是否正常。
4. `https://wangyibiao.com/pqc-arsenal` 是否正常。
5. 浏览器强制刷新后是否仍显示新图。
6. 开发者工具 Network 中是否出现图片 404。

如果代码已更新但图片仍是旧版，优先检查：

- JSX 是否仍引用旧文件名。
- 新图片是否真正提交到 `public/assets/`。
- Cloudflare 部署是否使用最新提交。
- 图片是否沿用了旧 URL，导致 CDN 命中缓存。

最稳妥的处理是更换带内容哈希的新文件名，而不是反复覆盖同名图片。

在 ChatGPT Work 环境中，如果 `gh` 不可用但 GitHub 应用已有写权限，可以使用仓库连接能力提交；更新分支引用时必须基于最新父提交，并保持 `force=false`。

---

## 11. ChatGPT Sites 相关注意事项

仓库包含 `.openai/hosting.json`，说明它也关联了一个已有 Sites 项目：

```json
{
  "d1": null,
  "project_id": "<已有项目标识>",
  "r2": null
}
```

注意：

- 不要创建第二个同名 Sites 项目。
- 不要修改或复制 `project_id` 到其他仓库。
- 当前没有 D1/R2 业务需求，不要仅因脚手架存在就引入数据库或对象存储。
- 若明确使用 Sites 做预览或部署，应遵循 Sites 生命周期，不要手动伪造部署产物。
- 若任务目标是 GitHub → Cloudflare 的 `wangyibiao.com`，不要把 Sites 部署成功误认为主域名已经更新。

在部分云端开发环境中，预览服务可能显示运行中，但浏览器连接仍超时。这通常是预览基础设施问题，不代表项目源码错误。若 `npm run build`、产物校验和路由测试均通过，不要为了修复临时连接问题随意重写 Vite host、端口或页面样式。

---

## 12. 常见问题与排查

### 12.1 右侧看起来像叠了很多层

检查是否重新引入了以下内容：

- 绝对定位的装饰武器。
- 多个 orbit 圆章。
- 背景网格与算法图同时出现。
- 旋转、裁切、多层阴影和纸片叠加。
- 同一张量仔图在背景和前景各出现一次。

正确结构应始终是：

```text
arsenal-hero-visual
├── armory-portrait        # 一个量仔
└── armory-algorithms      # 四张独立算法卡片
```

### 12.2 量仔失真或不完整

按顺序检查：

1. 是否仍引用 `liangzai-cutout-af7e8ddc.png`。
2. 是否设置 `object-fit: contain`。
3. 图片容器是否有固定宽高比与足够高度。
4. 是否误加了 `object-fit: cover`。
5. 是否使用 `transform: scaleX(...)`、非等比尺寸或剪切路径。

不要通过重新生成量仔解决 CSS 拉伸问题。

### 12.3 本地正常，Cloudflare 图片缺失

检查大小写、路径和提交内容：

```bash
git ls-files public/assets
rg -n '/assets/' app
```

Linux/Cloudflare 路径区分大小写。Windows 本地能加载不代表部署环境一定能加载。

### 12.4 页面能打开，但交互失效

确认 `ArsenalLab.tsx` 顶部仍保留：

```tsx
"use client";
```

并检查浏览器控制台是否存在 hydration、资源加载或 React 错误。

### 12.5 新算法参数切换后滑块越界

当前实现会使用：

```ts
Math.min(levelIndex, weapon.levels.length - 1)
```

新增算法时仍应检查默认 `levelIndex` 是否适合该算法的规格数量，并在 `chooseWeapon()` 中处理特殊情况。

---

## 13. 安全修改原则

- 不覆盖用户尚未提交的改动。
- 不强推 `main`。
- 不删除旧素材，除非已确认没有任何引用并获得明确授权。
- 不把 API 密钥、部署凭据或访问令牌写入仓库。
- `.env*` 只用于本地环境，并保持忽略状态。
- 不随意修改 `.openai/hosting.json`、Worker 入口或 Cloudflare 绑定。
- 不因页面暂时无法预览就跳过构建和测试。
- 修改技术内容时优先使用 NIST 等官方来源。
- 任何生成式图片都必须人工检查主体完整性、重复元素、乱码和水印。

---

## 14. 完成任务时的交付格式

新对话完成开发后，最终回复至少包含：

1. 实际完成了什么。
2. 修改了哪些关键文件。
3. 执行了哪些构建或测试，结果如何。
4. 是否已经提交 GitHub，提交链接或 SHA 是什么。
5. 是否已经验证 `wangyibiao.com` 的公开效果。
6. 如果无法完成公开验证，要明确说明限制，不要把“已推送”写成“已部署验证成功”。

这样可以避免下一次对话误判项目状态。

