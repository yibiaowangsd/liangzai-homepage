# 布局与主题

## 主题契约

当前支持纸白（`paper`）和午夜（`midnight`）两种主题，默认纸白。`public/theme/site-theme.js` 在 React 页面和独立实验室的 head 中同步加载，使保存的配色在首帧前生效。

主题代码只使用 `liangzai-theme` 存储键。无效偏好回退到纸白；存储受限时仍可在本页切换。BFCache 返回和跨标签页 storage 事件同步状态。当前没有跟随系统配色、Mist 或 Sand 选项。

React 的 `app/theme/ThemePicker.tsx` 和独立 HTML 选择器共用 bootstrap 及事件。切换主题更新语义 `--theme-*` 变量，不重建 React 子树，也不读写密码会话。图片和画布保留素材本色，控件跟随主题。

## 布局职责

| 位置 | 职责 |
| --- | --- |
| `app/studio/system.css` | 全站框架和共享设计规则 |
| `public/assets/site-typography.css` | 共享文字样式 |
| `public/assets/site-navigation.css` | React 与独立 HTML 的导航样式 |
| `public/theme/site-theme.css` | 配色变量及主题适配 |
| 各页面 CSS、`public/pqc-practice/studio.css` | 局部内容、模型控件与实验室布局 |

页面框架和工作区使用可用窗口宽度及边距，长文阅读列限制行长。模型、故事、新闻和独立实验室共用导航与主题规则；原观测站地址仅重定向到首页。

新增主题资源继续放在 `public/theme/`，避免沿用 `/assets` 的不可变资源策略。修改选项时同步 bootstrap、React 选择器、静态 HTML 和回归用例。

## 验证

`tests/site-theme.test.mjs` 检查保存偏好、无效值、存储受限、跨文档同步和源码配色对比度；布局相关用例覆盖页面结构、模型控件及实验室侧栏。这些检查不能代替渲染后的对比度与交互审查。

`npm run test:layout` 服务生产产物，以已提交的新闻数据替代在线 API，运行 Chromium、Firefox 和 WebKit。十三种视口覆盖 320～3840px 的竖屏、横屏、短桌面、超宽和 4K 窗口；检查十类页面的溢出、导航碰撞、目录、主题选择及观测站重定向，并输出截图。依赖安装和运行顺序见 [开发指南](../DEVELOPMENT.md)。

人工复核两种主题下的阅读和控件，尤其是主题切换后实验室会话保持、新闻分类与返回、模型视角、故事导航、dialog 焦点及减少动态效果。当前机器或既往任务的浏览器限制不作为永久环境要求。
