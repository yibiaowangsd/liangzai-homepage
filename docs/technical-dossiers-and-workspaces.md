# 技术档案、互通复验与「我」网页回顾

## 技术进展档案

- `/topics` 与 `/topics/[slug]`：首批ML-KEM、ML-DSA、SLH-DSA、AIGIS+、TLS迁移、UVW-KEM。
- `news/topics.js` 只做主题关联，不从关键词推断安全状态或修复结论。AIGIS+与旧版Aigis、TLS与TLCP保持区分。
- `scripts/generate-topics.mjs` 从 `news/inbox/YYYY-MM-DD.json` 中 `status: published` 的稿件和现有中文报告快照生成 `app/topics/topic-index.json`。`npm run dev/typecheck/build` 前自动重建；`npm run topics:generate` 可单独执行。专题索引和模块指纹文件为忽略的生成产物，随当前源码重建，无需增加D1扫描。
- 同一来源URL（保留报告片段锚点，去除追踪参数）合并重复收录，保留各次本站报道记录。相同来源的报道文字改变时更新版本指纹。日期明确为本站收录日期，不伪装为原事件日期。当前输入文件被覆盖后，不声称能还原Git历史中所有被覆盖的正文。
- 追踪、已读和版本指纹只保存在当前浏览器。打开页面不自动标已读；旧日期的稿件修订也会重新成为未读。此功能没有新增按主题邮件推送；现有栏目订阅审核、邮箱确认和机器人规则不变。
- NGCC报告仍显示原快照日期，同时提示快照之后的相关报道并链接原文。新新闻不能自动变成本站已复现结论，旧报告不能冒充实时评估。

## 密码工程互通

入口 `/pqc-practice/interop.html`，格式见 `public/pqc-practice/interop-format.md`。支持正向/负向验签、解封装结果比较、批量结果、取消、输入变更失效以及不含密钥原值的结果导出。

复用已有 `worker.js` 和发布WASM，测试包与结果均在浏览器内存生成。每项30秒上限；中止会终止Worker，不能导出为完整报告。示例生成器提供ML-KEM-768、ML-DSA-44、Aigis-Enc+和Aigis-Sig+正向/篡改材料。示例是同源流程测试，独立互通需要另一实现的材料。

`scripts/generate-interop-provenance.mjs` 在开发及构建前记录实际发布WASM/胶水指纹与实现来源。结果仅附本批涉及模块的记录。原生端可下载同一测试包，使用提供的Python运行器与显式C ABI适配层复验；不宣称直接兼容未知ABI。

## 「我」的网页阅读端

`/wo` 是公开可打开的本地文件阅读器，不是公开生活数据服务。页面不登录、不索取令牌、不自动连接私有仓库；导入内容不上传、不写浏览器存储，不随源码或构建产物发布。用户需主动从自己的仓库下载同一提交快照，解压并选择 `wo` 文件夹。

读取契约对应 `myapp` 的 `SharedData.kt` / `LifeMemory.kt`：v1/v2索引、普通日期、`wo-day-parts`和`wo-day-text-parts`、记忆原始字节哈希、日记录去除`asOfMs`后的哈希、时区、明确的`pendingDates`。只展示索引当前引用的日期；单日导入标为未经索引校验。缺失/损坏日期独立报错，不补成空白日或零活动；null指标保留未知。本人偏好、已有AI观察与来源日期分开显示。

当前提供横向片段时间轴、日期选择、跨日搜索、指标对照、来源与质量说明及已有记忆阅读。共享协议不含照片原图，本页不生成伪造照片。清空、中止、离开页面会清除当前读取状态；不自动回写App或ChatGPT账号记忆。

## 验证

```bash
npm run typecheck
npm run lint
npm run build
node --experimental-strip-types --test tests/*.test.mjs
```

重点覆盖专题去重/修订/已读、四类真实WASM测试包、负向预期与异常分离、结果脱敏、Unicode分片/哈希/缺失/取消，以及生产SSR输出。浏览器还需检查主题切换、移动布局、追踪重访、示例生成与复验、文件导入与清空。
