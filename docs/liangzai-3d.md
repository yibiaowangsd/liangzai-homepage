# 角色模型与资源

当前展示入口是 `/models`，由 `app/models/ModelGallery.tsx` 按需导入 `gallery-scene.ts`。首页不挂载旧星云展台；`/observatory` 重定向到首页。资源目录沿用原有名称，以保留模型页和关于我转场的引用。

## 模型页行为

初始选择双人合照，加载量仔和奶龙。单人模式只加载对应角色；模型切换会取消旧请求并释放旧场景。加载期间和失败时显示所选模式的 WebP 图片。

画布支持拖动旋转、滚轮或双指缩放，也提供正面、侧面、背面、缩放和重置按钮。自动旋转默认关闭，并跟随全站动效偏好。图片回退仍允许切换角色和视角；缩放及自动旋转按钮在回退状态禁用。

`gallery-scene.ts` 使用 Three.js、OrbitControls 和棚拍环境。卸载时取消动画帧，清理观察器、控件、模型、环境纹理与渲染器。旧星云引擎的限帧、DPR 和 Bloom 参数不能视为当前模型页配置。

## 资源来源与加载

量仔和奶龙来自原始 GLB；`app/experience/three/model-catalog.json` 记录原件与部署版本的 SHA-256、字节数、几何统计、贴图及分片路径。具体尺寸和资源预算以该清单为准。

生成脚本使用 gltfpack 的 EXT_meshopt_compression，保留命名部件和材质；不设置减面参数。奶龙贴图最大尺寸为 2048×1024。完整 GLB 分为最大 384 KiB 的内容哈希分片，放在 `public/assets/models/observatory/`。

`character-assets.ts` 并行下载所选模型分片，校验各片长度，顺序合并后交给 GLTFLoader 和 MeshoptDecoder。下载使用 18 秒超时与调用方取消信号。完整 SHA-256 和贴图一致性由资源测试核对，运行时加载器不重复执行完整哈希检查。

WebP 回退采用 `${mode}-${view}.webp`：模式为 `liangzai`、`nailong`、`duo`，资源视角为 `front`、`side`、`back`、`reset`。模型页重置按钮回到正面，旧模块仍可引用 reset 图片。

## 更新资源

在仓库根目录执行：

```bash
npm run models:prepare -- /path/to/liangzai.glb /path/to/nailong.glb
```

已有分片仅需更新 Web 贴图时：

```bash
npm run models:prepare -- --refresh-textures
```

后一模式先核对旧分片的长度和完整哈希，并保留原件来源字段。两种模式都会生成清单和分片；完整 Web GLB 写入忽略目录 `outputs/model-packed/`，不覆盖原始附件。提交更新后的清单与新分片，清理旧哈希分片前考虑已打开页面的缓存引用。

回退图片可通过 `scripts/render-observatory.py` 在安装 Blender/bpy 的独立环境生成；PNG 输出到 `outputs/observatory-renders/`，转换为对应 WebP 后提交。离线渲染不代表浏览器实时材质或帧率。

## 验证

```bash
node --experimental-strip-types --test tests/character-assets.test.mjs tests/resource-disposal.test.mjs
```

资源测试核对分片哈希、Meshopt 解码、几何、贴图和回退图片。页面或场景调整还需按 [开发指南](../DEVELOPMENT.md) 构建并检查 SSR 与浏览器交互，重点验证快速切换、取消加载、WebGL 丢失、缩放及动效暂停。

旧星云出场、粒子雕塑、融合和设备分档模块已删除；模型加载、刚性关节与棚拍环境继续供当前模型页和关于我转场使用。历史交互和优化过程可通过 Git 记录追溯。
