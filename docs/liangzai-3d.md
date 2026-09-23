# 量仔三维首页

根据角色主人提供的正面、侧面和背面设计图，重建可编辑的部件式三维角色。蓝白陶瓷外壳、金色猫耳内衬、双球弹簧天线、耳机、点阵眼睛、笑脸、Q 胸徽、手指、脚踝扣件和背部面板均为真实网格，不依赖角色贴图。

## 模型与再编辑

- `public/assets/models/liangzai-v1.glb`：可导入 Blender 等支持 glTF 2.0 的软件。包含命名部件、PBR 材质以及 Idle / Hello 两段动画。
- `app/experience/three/liangzai-model.ts`：参数化建模源文件，首页和 GLB 导出共用。+Y 向上，+Z 为正面。模型尺寸用于画面比例，并非实物尺寸标定。
- `npm run model:export`：重新导出并自动重新导入检查。Node 22.13+。
- 角色通过父子节点进行刚性关节运动，没有蒙皮骨骼或表情拓扑；如需影视级动作，可在 Blender 中继续绑定。
- `scripts/render-liangzai.py`：使用 Blender 4.5 的 Python 模块 `bpy` 在 CPU 上渲染模型预览。导入交付 GLB，重建同构的圆环、地台与灯光。`python scripts/render-liangzai.py reset front side back`。输出在忽略目录 `outputs/model-renders/`。

## 首页行为

角色、金属圆环与地台在同一个 Three.js 场景中渲染，使用统一环境反射、冷色轮廓光和实时阴影。支持拖动旋转、正侧背视角、复位、鼠标视线跟随、点击角色挥手；键盘左右键转动，Home 复位，Enter 打招呼。GSAP quickTo 缓和拖动和视线，timeline 驱动挥手，useEffect 与 gsap.context 在退出首页时清理资源。

Three.js 从客户端 effect 延迟导入，服务端不会初始化 WebGL 或计时器。浏览器不支持 WebGL、初始化失败或丢失上下文时，展示由同一 GLB 渲染的正侧背预览，并保留视角切换。初始化设 12 秒上限。预览图片与实时渲染使用不同渲染器，反射细节会有差别。

手机降低像素比、目标帧率并关闭 bloom；离屏、后台和全站暂停动效时停止持续渲染。减少动态效果模式下，视角按钮立即切换。Three.js 的全尺寸库与模型不加入其他页面的初始下载。

## 验证

`node --test tests/liangzai-model.test.mjs` 检查 GLB 导入、有限数值、关键角色部件、动画有效运动与面罩穿模回归；现有 rendered-html 测试覆盖五个页面和 Worker 无计时器导入。

本次浏览器预览环境禁用了 WebGL，因此网页检查覆盖桌面/手机布局、兼容预览和页面导航；模型造型通过 Blender CPU 渲染检查。实时 WebGL 画面及拖拽帧率需要在支持 WebGL 的设备上复核。
