# Explicit edition supplements

An administrator can send one reviewed update to the effective audience for a Beijing edition date. This is separate from normal scheduled delivery. Use it only after an explicit request to resend; publishing news alone never starts a supplement.

## Audience and content

The worker reads approved, confirmed, non-unsubscribed email subscriptions and approved robot subscriptions from D1. It preserves their saved categories, robot send mode and mention settings. Existing seven-desk subscriptions are not expanded to `flash`. Creating or resuming a campaign never approves an application, confirms an address, changes preferences or clears normal delivery history.

The preview returns article counts, a hash of the complete editorial content and a hash of the effective audience, with no addresses or webhook credentials. Start verifies both hashes and freezes the edition, per-recipient payload and approved configuration. Before each delivery, the worker checks the current subscription again; revoked or changed recipients are cancelled. Normal daily send claims atomically exclude campaign reservations to avoid simultaneous sends.

## Execution

All endpoints below require the existing operational `ADMIN_TOKEN` and accept only approved origins when an Origin header is present:

- `GET /api/admin/news/resend/preview?date=YYYY-MM-DD`
- `POST /api/admin/news/resend/start` with `date`, `edition_hash`, `audience_hash`, and `slugs`
- `POST /api/admin/news/resend/step` with `campaign_id` and `limit` (1–5, default 2)
- `GET /api/admin/news/resend/status?campaign_id=resend-YYYY-MM-DD`

A new batch is restricted to the current Beijing date. Its ID is always `resend-YYYY-MM-DD`; repeated starts resume the existing frozen batch, and different hashes are rejected. Titles explicitly say `更新补发`. Each step has bounded work and returns aggregate counters. No user email address, unsubscribe token or webhook is included in status output.

The trusted `resend-news.yml` workflow starts only for a dated `news/resend/*.json` request, or an administrator's explicit dispatch selecting that existing request. A request contains:

```json
{
  "date": "YYYY-MM-DD",
  "campaign_id": "resend-YYYY-MM-DD",
  "scope": "all-effective-subscribers-once",
  "edition_file": "news/inbox/YYYY-MM-DD.json",
  "edition_sha256": "SHA-256 of the reviewed edition file bytes",
  "reason": "The explicit reason and authorization for the supplement"
}
```

Deploy code and migrations first, then publish and verify the complete edition. Only then commit the concrete request. The workflow checks the local file hash, live content hash, slugs and counts before freezing the current effective audience. A restarted workflow reads the existing batch, preserving its audience and receipts.

## Receipts and interruptions

Email retries use a separate fixed Resend idempotency key and identical payload, stopping before the provider's 24-hour key lifetime. A positive API acknowledgement counts as accepted email, not proof of inbox placement or reading. Robots reuse the established manual sender, fixed send IDs and per-part receipts. Confirmed parts are not repeated. Network or ambiguous provider outcomes pause a robot job as `uncertain`; no automatic replay is allowed.

Status distinguishes complete recipients, confirmed message parts, pending, failed, uncertain and cancelled jobs. An interrupted workflow can resume the same request within the day. A finished batch cannot be replaced with another audience or edition that day. Never delete records or change IDs to force a retry.
