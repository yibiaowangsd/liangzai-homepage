# 关于我 · 金属反射名片

现有 `/about` 页面直接使用 `FloatingIdentity`，无需新增依赖。卡片为 320×500 CSS px、24 px 圆角；窄容器整体等比缩小，字体与内容不重排。

## 文件

- `app/about/FloatingIdentity.tsx`：React 组件、120/16 弹簧、交互与生命周期。
- `app/about/FloatingIdentity.module.css`：完整样式与 HTML 文字、高光边框。
- `app/about/metal-card-renderer.ts`：Canvas2D 环境、WebGL2 资源与三次绘制。
- `app/about/metal-card-shaders.ts`：完整 GLSL ES 3.00 顶点、双向模糊与反射片元代码。

## 运行

```bash
npm ci
npm run dev -- --host 0.0.0.0
# 打开 http://localhost:5173/about
npm run typecheck
npm run build
```

## 材质与交互

512×800 的 Canvas2D 每帧绘制蓝色板、带光照的暖色球与白色灯条；通过 `texSubImage2D` 更新已分配的纹理。经过横向、纵向两次 Gaussian 模糊后，用平面 UV 采样，在材质阶段按亮度去色。暖色球的径向颜色用于球体自身光照，不替代环境纹理。无全景、外部图片、人物或摄像头。

片元法线由 24 px 圆角距离场的倒角与细微拉丝噪声组成。CSS 的 `rotateX(x) rotateY(y)` 与 GLSL 的 `Rx(-x) * Ry(y)` 使用同一帧弹簧角度；负号来自 CSS 与着色器 Y 轴方向不同。相机到表面的入射方向用 GLSL 的 `reflect(incident, normal)` 反射（GLSL 标准参数顺序）。按 `q = R.z / max(R.z, 0.2)` 限制掠射角，并以 `0.12 * q * R.xy / max(R.z, 0.2)` 偏移平面 UV。

弹簧刚度 120、速度阻尼 16，积分步长不超过 1/120 秒；环境灯光跟随的指数阻尼为 12。鼠标移出、取消时目标归零，弹簧回正。尊重网站暂停动效与系统减少动态效果设置；标签页隐藏或卡片滚出视口时暂停绘制。

每次绘制检查未变形的 `clientWidth/clientHeight` 和实时 DPR，只有变化时更新 drawing buffer。模糊纹理尺寸固定，不在每帧重新分配；DPR 仅受 GPU 最大 renderbuffer 尺寸限制。

初始化失败、上下文丢失与卸载均取消动画并释放 shader、program、texture、framebuffer 和 VAO。初始化失败只保留可访问的 HTML 信息和纯色底，不创建另一个渲染器或渐变反射替代品。
