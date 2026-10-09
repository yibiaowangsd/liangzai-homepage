# 群机器人日报订阅

公共入口与邮箱订阅一致：`/news/subscribe` 选择「群机器人」，填写完整 webhook、群名称/称呼、新闻板块和申请理由。两种渠道均需管理员审核，机器人无需邮箱确认；默认不 @ 任何人。申请与重复提交均不触发群消息。

管理员在 `/news/subscriptions/review` 登录后切换「群机器人」，查看脱敏地址、板块与申请理由，配置不 @ 或指定成员后通过。指定成员使用群中登记的手机号，最多 20 人；每份日报只在第一条消息提醒。公众不能配置 @、批准申请或覆盖已获批的设置。管理员可修改成员提醒或填写理由撤销批准；修改后停止未发送的旧任务，下一份日报使用新配置，已经发送的消息无法撤回。

已通过列表中的「立刻发送」按已保存的板块与成员配置立即发送当日日报，页面显示逐条进度和结果；当日已发送、结果不确定或任务已停止时不重复发送。按钮只向该机器人发送，不影响其他群。为避免等待整份日报造成请求超时，每次请求确认一条消息后继续；关闭页面后，未发送部分由定时任务继续。

## 存储与部署

`0003_robot_subscriptions.sql` 新增申请和每个机器人每天的发送记录。完整地址用 AES-GCM 加密，随机 nonce，申请 id 作为附加认证数据；列表只返回域名和密钥末四位。服务器使用 `ROBOT_WEBHOOK_SECRET`，未单独配置时使用现有 `NEWSLETTER_TOKEN_SECRET` 或 `ADMIN_TOKEN`，无需新增部署配置。加密密钥不得直接轮换：先使用原密钥解密、再用新密钥重新加密所有地址并更新身份摘要，否则原申请无法发送。密钥只保存在 Worker Secret，不能放入源代码。

旧版 `NEWS_BOT_WEBHOOK_URL` 不再用于发送，旧 `robot_deliveries` 保留历史记录。迁移不会自动批准任何旧机器人；需从订阅页提交并由管理员审核。同一群当日已有旧版发送记录时不重新发送，下一份日报进入新订阅流程。

复用每十五分钟的 Worker Cron。北京时间当天五个核心板块各至少五条新闻后，下一轮开始发送所选板块，每板块一条文本消息，附摘要、来源和直接打开原文的链接。历史补刊不补发。每轮处理最多五个机器人，其余下一轮继续。消息之间至少间隔 3.1 秒，不跟随重定向；当前支持 `imtwo.zdxlz.com` 的 HTTPS webhook。

## 消息与发送记录

```json
{"type":"text","textMsg":{"content":"UTF-8 日报正文","isMentioned":true,"mentionType":2,"mentionedMobileList":["13800000000"]}}
```

指定成员仅由审核配置生成；其他板块 `isMentioned: false`。消息服务须返回明确成功标识（如 `ok: true, code: 200`），HTTP 200 本身不代表送达。

每个机器人每天唯一任务，原子租约防止并发重复发送，正文与成员配置在创建任务时固定。逐条保存已确认进度，并在每条发送前重新核对批准状态和版本。明确拒绝/限流后十五分钟重试未发送部分，最多五轮；超时、连接中断、无效响应、5xx 和过期发送租约标记 `uncertain`，暂停自动重试，先在群里核对消息。供应商没有幂等接口，无法保证网络故障时恰好一次。

新增机器人会继承同一 webhook 的当日旧版推送记录。如果旧版结果未确认，审核卡片显示具体原因及「核对后重试」。管理员必须先核对群内未收到待确认的消息，勾选说明后点击「确认并重试」。后端按本次状态令牌原子恢复任务，已确认的部分不会重发；旧版空任务则按当前审核的板块和成员配置重建正文。原旧版历史保留。普通「立刻发送」及 Cron 不会自行解除未确认状态，状态变化、撤销审核、成员配置版本变化和仍在发送中的旧任务都不能被重试绕过。

## API

- `POST /api/robot-subscriptions`：提交申请（webhook、name、categories、reason、consent）。仅接受待审核申请；忽略公众提交的批准/@ 参数。
- `GET /api/admin/robot-subscriptions?status=pending&page=1`：审核列表，分页 50 条，含当日发送状态，不返回明文 webhook、密文或完整密钥摘要。
- `POST /api/admin/robot-subscriptions/:id/approve`：通过并配置 `mention_mode`（none/members）、`mention_mobiles`。
- `POST /api/admin/robot-subscriptions/:id/mentions`：管理员修改已获批机器人的成员配置。
- `POST /api/admin/robot-subscriptions/:id/send`：管理员立即发送该机器人的当日日报，每次请求最多一条，`more` 表示可以继续；使用与 Cron 相同的去重、批准检查和限流规则。
- `POST /api/admin/robot-subscriptions/:id/retry`：管理员核对后的重试，必须携带 `confirm_not_received: true` 和最新 `recovery_token`；只恢复当前未确认的任务，每次最多一条，其余通过 `send` 继续。
- `POST /api/admin/robot-subscriptions/:id/reject`：填写 `note` 拒绝或停止推送。

审核接口使用与邮箱相同的 `NEWSLETTER_ADMIN_TOKEN || ADMIN_TOKEN` Bearer 认证。运维接口 `GET /api/admin/robot/status` 使用发布 `ADMIN_TOKEN`，只返回汇总和当日各状态数量；原 `/api/admin/robot/send` 返回定时任务说明，不在 HTTP 请求里批量群发。

日志只记录数量与安全状态码，不能记录 webhook、手机号、正文或供应商原始响应。单元测试与浏览器测试使用示例地址和模拟服务，不向真实群发送测试消息。
