# 动效与转场

## 共享动效

`app/experience/Motion.tsx` 提供 ExperienceProvider、useExperience 和页面动效。系统 `prefers-reduced-motion`、当前会话暂停和 `liangzai-motion` 保存状态共同决定是否启用动效；存储不可用时仍可在当前页面暂停。

GSAP 插件只在浏览器注册。Cloudflare 求值 SSR 模块时不能启动 ticker 或顶层计时器；`tests/rendered-html.test.mjs` 会在禁止计时器的独立进程中导入实际构建的 Motion 模块。

`useGSAP` 使用组件 scope 和生命周期清理。页面滚动渐入只处理首屏下方尚未显示的 `data-reveal` 元素；首屏内容保持可读，偏好变化不会再次隐藏已经绘制的内容。matchMedia 管理桌面视差和细指针交互，卸载时清理动画、ScrollTrigger 及事件监听。

## 页面入场与序幕

`PageArrival.tsx` 与 `page-arrival.ts` 管理 React 路由和独立 HTML 页的短入场。关于我转场与实验室重定向中间页避免重复入场；快速换页、后台切换、卸载和关闭动效时清理动画。

首页 `CinemaEntrance` 由“播放序幕”按钮打开，不在首次访问自动播放。原生 dialog 播放约 4.8 秒，支持跳过、空格和 Escape；关闭恢复滚动与原焦点，卸载取消计时器。

故事旁白由用户开始播放，素材页序与音轨关系由 `app/storybook/storyData.ts` 维护。

## 关于我转场

`AboutPushTransition.tsx` 接管站内普通点击的 `/about` 链接；修饰键、新窗口和当前页链接保留原有行为。开启动效时可在悬停或键盘聚焦后预取角色分片；实际点击时冻结离开页视口，并等待路由就绪再推进转场。

`about-push.ts` 和 `three/about-push-scene.ts` 使用短生命周期的透明画布。跳过、Escape、返回、尺寸变化、后台切换或加载超时均清理遮罩和资源；减少动态效果或手动暂停时直接导航。

独立实验室和接入记录使用 `about-push-static.ts`，播放后进行顶层导航；避免 iframe 预览导致重复入场。BFCache 返回时恢复旧内容。`build/about-push-assets.ts` 生成独立页面所需的包，修改共享源码后重新启动开发服务。

## 验证边界

常规构建、类型检查和测试命令见 [开发指南](../DEVELOPMENT.md)。相关回归包括 `tests/page-arrival.test.mjs`、`tests/about-push-image.test.mjs`、`tests/cinema-details.test.mjs` 和 SSR 的计时器检查。

浏览器复核动效暂停、减少动态效果、快速导航、Escape、弹窗焦点和实验室返回。静态测试不能代替真实 WebGL、视觉或帧率测量。模型页的渲染实现另见 [模型说明](liangzai-3d.md)。
