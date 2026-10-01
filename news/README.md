# News publishing pipeline

每日新闻采用“日报 / edition”结构，而不是无限文章流。

## 固定日报结构

每天固定发布 25 条：

- `pqc`：后量子密码 / 算法 / 实现 / 迁移，5 条
- `protocol`：TLS / TLCP / SSH / IKE / IPsec 抗量子协议，5 条
- `standards`：PQC 标准、RFC、草案和标准组织状态，5 条
- `security`：密码与网络安全、威胁情报、攻防和安全产品，5 条
- `ai`：AI 模型、Agent、开发工具和基础设施，5 条

最终每天必须是 5 × 5 = 25 条。

## 正文与来源规则

摘要仅用于列表和标题下的导语（约100～180字），不能拿摘要充当详情正文。

- 每篇详情采用新闻网站式连续长文，通常600～1600字，至少5个实质段落。先对原始资料做中文翻译或编译，保留主要事实、技术机制、论证、数据口径和限制；再用 `## 量仔观察` 分隔本站独立总结。不能把事实压缩成一句话，再靠通用建议凑长度。
- 原文很长时按论证顺序进行较完整的编译；有合法全文翻译权限的资料可翻译全文。版权原文采用受许可及引用限额约束的编译，保留原文入口，不发布未经授权的全文译本。来源很短时补充有依据的背景与针对性分析；资料不足就换选题。
- 正文开头明确原始发布日期。本站日报日期与原文日期分开，早期资料标明“近期回顾”或“研究／规范回顾”。优先近24小时，必要时回溯72小时；更早资料只选择仍有实质价值的内容，不能伪装成当天发布。
- 实际阅读一手原文，不能只看搜索摘要。优先官方标准组织、主管部门、原始论文、项目仓库与厂商公告，国内外同等关注。来源不可访问或无法核实时更换来源。
- 区分作者主张、已验证事实与本站推断。性能数字必须注明测试范围；产品区分宣布、预览、Beta和正式可用；规范区分草案、工作组、IESG批准、编辑队列及正式RFC，并说明类别。
- 同一事件不跨栏目重复；历史事件仅在有实质更新时再报。补写历史详情保留已有slug和原文链接，以免旧链接失效。
- 只用少量小标题辅助阅读，不把整篇写成要点卡片或多个重复摘要。每篇分析必须对应其具体机制、证据和限制。

## Publishing flow

1. ChatGPT 生成当天完整日报。
2. 写入 `news/inbox/YYYY-MM-DD.json`。
3. `.github/workflows/publish-news.yml` 调用 `news/validate-edition.py`，检查25条、每类5条、日期与slug、原文地址，以及长文、来源日期和独立分析结构。
4. Workflow 调用 `POST https://api.wangyibiao.com/api/admin/news/batch`。
5. Worker 按 `slug` 幂等 upsert，并同步移除当天新版日报中已不存在的旧条目。
6. `/news` 通过 `/api/news/editions?page=N&pageSize=3` 按日报展示，一页最多 3 天。

## Required repository secrets

- `NEWS_ADMIN_TOKEN`：与 Worker 的 `ADMIN_TOKEN` 一致。
- `CLOUDFLARE_API_TOKEN`：用于部署 Worker。
- `CLOUDFLARE_ACCOUNT_ID`：Worker 与 D1 所在 Cloudflare Account ID。

不要把这些值提交到仓库。

## Daily payload

```json
{
  "date": "2026-10-01",
  "items": [
    {
      "slug": "20261001-example-story",
      "title": "示例标题",
      "summary": "100～180 字中文摘要",
      "content": "连续长文：原始资料的中文翻译／编译，明确原文日期，再用 ## 量仔观察 分隔独立总结；通常600～1600字",
      "category": "pqc",
      "tags": ["PQC", "IETF"],
      "source_name": "IETF Datatracker",
      "source_url": "https://example.com/source",
      "cover_image": null,
      "published_at": "2026-10-01T00:30:00Z",
      "status": "published"
    }
  ]
}
```

`published_at` 表示本站日报发布时间，使当天 25 条进入同一个 edition；原始来源发布日期写进正文。

## Idempotency

`slug` 是稳定唯一键：

- 新 slug：insert
- 已存在但内容变化：update
- 完全一致：skip
- 当日完整日报重发时，Worker 会删除当天不再出现在 JSON 中的旧 published 条目

这样定时任务重试不会产生重复新闻。

## Local validation

```bash
python3 news/validate-edition.py news/inbox/2026-10-01.json
```

发布前的最低结构要求：正文不少于600字符、至少5段，含来源日期与单独的“量仔观察”。此检查防止短摘要误发布；事实、翻译准确性与版权许可仍须逐条编辑核实。当天完整日报会替换D1中同日条目，提交前必须保留全部25条。
