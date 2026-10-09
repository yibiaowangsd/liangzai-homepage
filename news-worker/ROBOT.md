# 群机器人日报

复用现有每日前沿数据与 Worker 定时任务，不需要新增 ChatGPT 定时任务。完整日报发布后立即尝试推送，现有每十五分钟的 Cron 继续检查北京时间当天的数据。历史补刊不会补发到群。

五个核心板块各至少五条新闻才发送，每个板块一条文本消息，共五条。每条包含日期、板块、五条新闻的中文摘要、来源和原文地址。链接直接打开原始来源，没有有效原文地址时不回退到本站文章。不 @ 所有人或个人，不发送订阅者邮箱、申请理由或审核信息。

## 凭据配置

在 GitHub 仓库的 Actions Secrets 添加 `NEWS_BOT_WEBHOOK_URL`，值为完整 webhook 地址。`Deploy news API Worker` 通过权限为 0600 的临时文件，在部署代码时将其同步为 **liangzai-news-api** 的 Cloudflare Secret，随后删除临时文件。值不出现在源代码、前端、工作流日志或状态接口中。未配置 Secret 时机器人功能关闭，邮件订阅继续运行。

也可以直接在 Cloudflare Worker 的 Variables and Secrets 配置同名 Secret；部署保留已有凭据。当前适配 `imtwo.zdxlz.com/im-external/v1/webhook/send`，只允许 HTTPS，不跟随重定向。

## 已确认的消息协议

```json
{
  "type": "text",
  "textMsg": {
    "content": "UTF-8 日报正文",
    "isMentioned": false
  }
}
```

消息服务返回 `ok: true, code: 200` 确认成功，不能只根据 HTTP 200 判断送达。每个请求间隔至少 3.1 秒，同一机器人每分钟不超过 20 条。不要同时用其他系统高频调用同一机器人。

## 发送状态与重试

`0002_robot_digest.sql` 只新增 `robot_deliveries` 表，保留现有新闻与邮件订阅数据。每个日报日期唯一，通过原子租约防止并行调用重复发送。正文在首次发送前固定，逐条记录已确认进度，后续改稿不会重复群发。

机器人明确拒绝或返回限流时，十五分钟后从未确认的板块继续，最多五轮。连接中断、超时、无效响应、服务器 5xx 或过期发送租约无法证明是否送达，因此标记 `uncertain` 并暂停自动重试。该接口没有提供服务端幂等键，不能承诺网络异常时“恰好一次”；遇到 `uncertain` 应先在群中核对消息，再由维护者处理发送记录，不能直接重置整日报导致已确认消息重发。

轮换地址后不会重发当天已发送日报；尚未发送的旧地址任务会停止，避免把固定正文发送到意外目的地。当天没有完整日报就等待，不发送空消息或冒充当天的旧日报。

## 运维接口

- `GET /api/admin/robot/status`：查看当天配置与进度。
- `POST /api/admin/robot/send`：尝试推送当天完整日报，遵守同一去重规则。

均需现有新闻发布 `ADMIN_TOKEN` 的 Bearer 认证；接口不返回 webhook。公开 `/api/health` 仅返回 `robot_ready` 布尔值。日志只记录数量与状态，不记录目的地址、正文、凭据或供应商原始错误。

验证：`node --test tests/news-robot.test.mjs tests/news-subscriptions.test.mjs tests/news-editions-api.test.mjs`。单元测试使用本地 SQLite 和模拟 webhook，不发送真实消息。接入时另外发送一条明确标注的测试消息确认协议。
