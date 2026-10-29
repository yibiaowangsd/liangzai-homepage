# 关于我 · 原版悬浮银色名片

2026-10-29 按用户要求恢复到 WebGL2 改版前。`FloatingIdentity.tsx` 和 `FloatingIdentity.module.css` 直接取自 `a3e88e3^`，即 2026-10-09 的 `b1a2a73` 所确定的横版设计；并非另做近似版本。

名片保持 460×292 CSS px，银色拉丝、金色曲线线刻、单行 Wang Yibiao、工作与教育、主页和 GitHub 链接。窄容器对整个物件等比缩小，不重新排列文字。视口可见且动效开启时 8 秒轻微悬浮；鼠标进入后暂停悬浮，指针驱动小角度倾斜与高光位置，移出回正。键盘聚焦时回正并保持链接焦点轮廓；关闭动效或系统减少动态效果时停止动效。

源码只使用 HTML、CSS 与 SVG。移除 10 月 22 日新增的 WebGL2 renderer/session/shaders、卡号和失败重试界面。外观及文字显示无需 GPU 初始化，不再与转场争用 WebGL 上下文。

历史依据与完整回归记录见 [about-lab-restoration.md](about-lab-restoration.md)。
