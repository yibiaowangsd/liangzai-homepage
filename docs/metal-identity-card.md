# 关于我 · 横版金属名片

`/about` 的个人名片保持 **460×292 CSS px 横版**，圆角 24 px；窄容器整体等比缩小。保留 Wang Yibiao 单行姓名、工作、教育、金色线刻及个人链接，在底栏加入 `0001 2345 6789`。

只采用 WebGL2 金属反射。没有纯色名片、CSS 渐变反光、替代图片或其它渲染器作为降级。名片的 HTML 信息和排版始终可见。WebGL2 初始化或绘制失败时，立即停止绘制并清理资源，提供失败原因和重试入口；重试重新创建 Canvas 和 WebGL2 资源，不把名片整体隐藏。

## 源码

- `app/about/FloatingIdentity.tsx`：React 组件，120/16 弹簧、阻尼 12 的环境灯光跟随、移出回正、视口暂停和清理。
- `app/about/FloatingIdentity.module.css`：横版名片布局、HTML 文字与高光边框。原有金色线刻使用 SVG，其渐变只用于线刻着色。
- `app/about/metal-card-renderer.ts`：768×512 Canvas2D 环境与 WebGL2 渲染资源。
- `app/about/metal-card-shaders.ts`：完整 GLSL ES 3.00 顶点、模糊与金属片元代码。

## 运行

```bash
npm ci
npm run dev
# 打开 http://localhost:5173/about
npm run typecheck
npm run build
```

环境每帧绘制蓝色板、暖色球和白色灯条，使用 `texSubImage2D` 上传已分配的纹理。横向、纵向 Gaussian 模糊后，按倒角及拉丝噪声法线反射，再去色为银色。使用平面 UV 贴图，不使用全景、外部图片或摄像头。

相机到表面的入射方向通过 GLSL 标准顺序 `reflect(incident, normal)` 反射；使用 `q = R.z / max(R.z, 0.2)` 限制掠射角，偏移量为 `0.12 * q * R.xy / max(R.z, 0.2)`。CSS 与 GLSL 使用同一帧角度；`Rx(-x) * Ry(y)` 中的负号对应 CSS 向下的 Y 轴。

每帧检查实际 CSS 尺寸与 DPR，只在发生变化时重设 drawing buffer；模糊纹理固定分配。页面隐藏、卡片离开视口时暂停，卸载和失败时清理 RAF、observer、事件、shader、program、texture、framebuffer 与 VAO。

## 验证

横版修订通过 TypeScript、ESLint、生产构建及 Mesa OpenGL ES 3.2 原始 GLSL 离屏绘制检查。离屏测试覆盖圆角透明、去色、倾斜导致反射像素变化及 GL 错误；不代替完整浏览器交互测试。

当前远程预览浏览器没有 WebGL2，可以检查横版名片信息和错误原因，无法检查动态金属反射；不使用替代材质。竖版静态替代截图已从当前源码移除。`metal-card-before.jpg` 为此次材质改造前的原横版页面。
