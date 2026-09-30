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

## Publishing flow

1. ChatGPT 生成当天完整日报。
2. 写入 `news/inbox/YYYY-MM-DD.json`。
3. `.github/workflows/publish-news.yml` 验证 JSON、25 条总数和每个栏目恰好 5 条。
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
      "content": "Markdown 正文，至少包含技术内容、关键结论和研发启发",
      "category": "pqc",
      "tags": ["PQC", "IETF"],
      "source_name": "IETF Datatracker",
      "source_url": "https://example.com/source",
      "cover_image": "https://wangyibiao.com/news-covers/pqc.svg",
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
