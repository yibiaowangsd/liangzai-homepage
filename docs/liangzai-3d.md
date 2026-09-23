# 双角色星空展台

当前首页使用角色主人提供的 `liangzai-refined(1).glb` 与 `nailong (1).glb`。旧的程序建模与旧预览已移除。

## 模型来源与资源

`app/experience/three/model-catalog.json` 记录原文件 SHA-256、压缩版本 SHA-256、几何统计及分块路径。使用 gltfpack / EXT_meshopt_compression 压缩，保留命名部件、材质、贴图；没有设置减面参数。位置 16 bit、法线 12 bit、UV 14 bit 量化。奶龙的少量退化三角形在清理时被移除，正常表面保留。模型总下载由约 19.5 MB 降为约 4.1 MB；奶龙贴图字节与原件一致。

为避免发布接口在单次大文件请求上长时间等待，模型以最大 384 KiB 的内容哈希分块存放在 `public/assets/models/observatory/`。加载器并行下载当前所需模型的所有部分，校验长度、按顺序合并后交给原生 GLTFLoader + MeshoptDecoder 解码。默认只加载量仔，奶龙按需加载，加载过的角色在当前场景中复用。分块 URL 含模型内容哈希，避免 CDN 混合新旧资源。

模型准备：`npm run models:prepare -- /path/to/liangzai-refined.glb /path/to/nailong.glb`。完整压缩 GLB 留在忽略目录 `outputs/model-packed/`；原始附件不改写。提交生成的 catalog 与 `.bin` 文件。

## 交互与场景

- 三种模式：量仔、奶龙、同时展示。双角色在各自轴心旋转，自动调整比例、站位与取景，前视不互相遮挡。
- 正面 / 侧面 / 背面 / 复位；拖拽旋转；键盘左右键 / Home；点击角色或 Enter 唤起星光。
- 两个上传模型没有骨骼或内置动画，因此保留原始造型，采用刚性转动、轻微浮动和底座星光响应。没有强行绑定或弯曲奶龙表面。
- 大面积柔光、暖白主光、淡蓝轮廓光、定制棚拍反射环境，减少强烈色染。玻璃星空底座包含星云纹理、细小星点、星座连线及金属边缘；背景圆环降低亮度，突出角色。
- GSAP quickTo 缓和拖动，timeline 控制星光与浮动；减少动态效果 / 全站暂停动效时停止连续动画。手机限制像素比与帧率、关闭 bloom；离屏和后台暂停绘制。
- 下载有 18 秒上限、着色器准备有 10 秒上限；快速切换只应用最后一次选择；退出页面中止请求并释放网格、纹理、ImageBitmap、渲染目标和监听器。WebGL 不可用或加载失败时提供三种模式的四视角渲染预览。

## 渲染与验证

`scripts/render-observatory.py` 使用 Blender 4.5 / bpy，从原始 GLB 渲染完整场景。运行：`python scripts/render-observatory.py liangzai.glb nailong.glb`；也可追加 `duo:reset` 等指定视角。PNG 输出至 `outputs/observatory-renders/`，转换为同名 WebP 后提交到展台资源目录。离线渲染与 Three.js 的实时反射细节会不同。

测试覆盖资源分块 SHA-256、Meshopt 解码、有限几何数值、贴图原样保留、原始模型尺寸归一化、双角色站位与底座边界；已有测试覆盖五个 SSR 页面及 Worker 禁止的顶层计时器。浏览器已验证分块下载与实际 GLTF 解码：量仔 68 个网格，奶龙 5 个网格，奶龙贴图成功解码为 4096 × 2048。当前自动预览浏览器禁用了 WebGL，网页检查覆盖模式/视角兼容预览和桌面/手机布局；实时 WebGL 操作与帧率仍需支持 WebGL 的设备复核。
