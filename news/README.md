# News publishing pipeline

The daily publishing flow is:

1. ChatGPT prepares a structured JSON file for the day.
2. The file is committed to `news/inbox/YYYY-MM-DD.json`.
3. `.github/workflows/publish-news.yml` validates the payload.
4. The workflow calls `POST https://api.wangyibiao.com/api/admin/news/batch`.
5. The Worker performs idempotent upsert by `slug` into the D1 `news` table.

## Required repository secret

Create this repository secret before enabling automatic publication:

- `NEWS_ADMIN_TOKEN`: must exactly match the Worker secret `ADMIN_TOKEN`.

To let GitHub deploy changes under `news-worker/`, also configure:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with permission to deploy Workers and read D1 metadata for the account.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID that owns `liangzai-news-api` and `liangzai-news-prod`.

Do not commit any of these values.

## Daily payload

File path:

```
news/inbox/YYYY-MM-DD.json
```

Shape:

```json
{
  "date": "2026-10-01",
  "items": [
    {
      "slug": "20261001-example-story",
      "title": "示例标题",
      "summary": "100～180 字摘要",
      "content": "Markdown 正文",
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

Allowed categories:

- `pqc`
- `protocol`
- `standards`
- `security`
- `ai`
- `industry`
- `daily`
- `test`

Allowed statuses:

- `draft`
- `published`

## Idempotency

`slug` is the stable unique key.

- new slug: insert
- existing slug with changed content: update
- existing slug with identical normalized content: skip

This makes retries safe and prevents duplicate rows from repeated automation runs.
