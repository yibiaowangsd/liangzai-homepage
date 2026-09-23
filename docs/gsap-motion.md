# GSAP 全站动效与视觉规范

## 技能来源

按 GSAP 官方技能仓库 https://github.com/greensock/gsap-skills 的 gsap-core、gsap-react、gsap-timeline、gsap-performance、gsap-scrolltrigger、gsap-plugins 实现。阅读基线：`aed9cfd3277740755f6bfc1155c7aa645403b760`。

- `useGSAP` 绑定组件 scope，依赖更新时按需 revert，卸载清理动画和 ScrollTrigger。
- `gsap.matchMedia` 管理桌面视差、横向 pin 和系统 reduced-motion。
- `SplitText` 使用 autoSplit 和返回 tween 的 onSplit，字体或宽度变化后重排。
- Timeline 编排标题、图像、阅读器与算法面板；连续动画优先 transform/opacity。
- `quickTo` 驱动指针交互；Canvas 数值补间形态，ticker 仅在可见且未暂停时运行。
- ResizeObserver 只调度下一帧尺寸更新，避免观察回调内布局写入循环。

## 页面与内容边界

五页共享深黑背景、银色金属、冰蓝高光、大字留白。原角色、11 页故事与旁白、武器库教学数据保留。个人页只使用姓名与已有公开研究方向，不添加学历、雇主、头衔、项目成果或私密联系方式。WY 字母为抽象身份图形，不是本人肖像。

首页横向章节仅在大于 1100px 时 pin；较窄屏幕使用原生横向滑动。所有正文 SSR 可见，关闭动画不影响阅读或链接。

## 素材与播放

- `public/assets/cinematic/quantum-portal-v1.webp`：本次生成的金属量子门场景，约 124 KB。原量仔透明素材独立叠放，未生成替代角色。
- `public/assets/cinematic/quantum-prologue-v1.mp4`：以现有故事图制作的 12 秒无声视觉序章，平移、缩放与淡入淡出，H.264，约 534 KB（960 × 540）。
- 视频仅在用户打开弹窗后挂载，手动播放，无循环、无自动播放。关闭弹窗或进入后台暂停。原故事旁白同样无初始自动播放；用户开始收听后，当前章结束才连续下一章。
- 粒子场为交互艺术，不表示真实量子态。DPR 限制为 1.6，离屏与后台移除 ticker；减少动效时只在尺寸/形态变化时重绘。

## 验证

执行 `npm run build`、`node --test tests/rendered-html.test.mjs`、`npm run lint`。五条渲染用例检查页面标题、主要入口、故事数据、算法内容与人物页；浏览器检查桌面和 390px 手机宽度、菜单、翻页/旁白、算法/参数、短片、粒子形态及动效开关。

现有 `<img>` lint 提示保留；全仓 tsc 仍有既有 Cloudflare ambient types 缺口，构建和服务器渲染检查单独验证。

## Cloudflare SSR 边界

GSAP 插件只在 `typeof window !== "undefined"` 时注册。`useGSAP` 的 headless 注册会唤醒 ticker；SSR 模块求值阶段不得启动计时器。回归检查在独立进程中禁止计时器后加载实际构建的 Motion 模块，避免 Node 普通渲染检查遗漏该类 Worker 错误。
