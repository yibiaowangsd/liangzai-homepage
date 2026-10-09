# 群机器人日报订阅

公共入口与邮箱订阅一致：`/news/subscribe` 选择「群机器人」，填写完整 webhook、群名称/称呼、新闻板块和申请理由。两种渠道均需管理员审核，机器人无需邮箱确认；默认不 @ 任何人。申请与重复提交均不触发群消息。

管理员在 `/news/subscriptions/review` 登录后切换「群机器人」，查看脱敏地址、板块与申请理由，配置不 @ 或指定成员后通过。指定成员使用群中登记的手机号，最多 20 人；每份日报只在第一条消息提醒。公众不能配置 @、批准申请或覆盖已获批的设置。管理员可修改成员提醒或填写理由撤销批准；修改后停止未发送的旧任务；后台立刻发送使用新配置，下一份自动日报也使用新配置，已经发送的消息无法撤回。

已通过列表中的「立刻发送」按已保存的板块与成员配置发送当日日报，逐条显示进度。每次点击从第一条开始，允许当天重复发送，不受自动任务或旧版记录的成功、失败、未确认状态阻拦。只向该机器人发送，每个订阅板块一条；所选板块各至少五条已发布新闻才发送。每次请求确认一条后继续，失败或关闭页面即停止本次主动发送；再次点击可重新发送整份日报。主动发送不修改自动任务记录，自动推送仍每天一次。

## 存储与部署

`0003_robot_subscriptions.sql` 新增申请和每个机器人每天的发送记录。完整地址用 AES-GCM 加密，随机 nonce，申请 id 作为附加认证数据；列表只返回域名和密钥末四位。服务器使用 `ROBOT_WEBHOOK_SECRET`，未单独配置时使用现有 `NEWSLETTER_TOKEN_SECRET` 或 `ADMIN_TOKEN`，无需新增部署配置。加密密钥不得直接轮换：先使用原密钥解密、再用新密钥重新加密所有地址并更新身份摘要，否则原申请无法发送。密钥只保存在 Worker Secret，不能放入源代码。

旧版 `NEWS_BOT_WEBHOOK_URL` 不再用于发送，旧 `robot_deliveries` 保留历史记录。迁移不会自动批准任何旧机器人；需从订阅页提交并由管理员审核。自动任务在同一群当日已有旧版发送记录时不重新发送，下一份日报进入新订阅流程。

复用每十五分钟的 Worker Cron。北京时间当天五个核心板块各至少五条新闻后，下一轮开始发送所选板块，每板块一条文本消息，附摘要、来源和直接打开原文的链接。历史补刊不补发。每轮处理最多五个机器人，其余下一轮继续。消息之间至少间隔 3.1 秒，不跟随重定向；当前支持 `imtwo.zdxlz.com` 的 HTTPS webhook。

## 消息与发送记录

```json
{"type":"text","textMsg":{"content":"UTF-8 日报正文","isMentioned":true,"mentionType":2,"mentionedMobileList":["13800000000"]}}
```

指定成员仅由审核配置生成；其他板块 `isMentioned: false`。消息服务须返回明确成功标识（如 `ok: true, code: 200`），HTTP 200 本身不代表送达。

自动推送为每个机器人每天唯一任务，原子租约防止并发重复发送，正文与成员配置在创建任务时固定。逐条保存已确认进度，并在每条发送前重新核对批准状态和版本。明确拒绝/限流后十五分钟重试未发送部分，最多五轮；超时、连接中断、无效响应、5xx 和过期发送租约标记 `uncertain`，暂停自动重试，先在群里核对消息。供应商没有幂等接口，无法保证网络故障时恰好一次。

自动任务继承同一 webhook 的当日旧版记录并保留原历史。后台主动发送直接读取当前已批准的板块与管理员成员配置，不需额外核对弹层或恢复状态令牌。每条发送前复核批准与配置版本；撤销后不能再发送，发送过程中配置变化则停止，重新点击使用新配置。Worker 请求使用 `redirect: "manual"` 并拒绝所有 3xx，避免把凭据或正文转发到其他地址。

## API

- `POST /api/robot-subscriptions`：提交申请（webhook、name、categories、reason、consent）。仅接受待审核申请；忽略公众提交的批准/@ 参数。
- `GET /api/admin/robot-subscriptions?status=pending&page=1`：审核列表，分页 50 条，含当日自动推送状态，不返回明文 webhook、密文或完整密钥摘要。
- `POST /api/admin/robot-subscriptions/:id/approve`：通过并配置 `mention_mode`（none/members）、`mention_mobiles`。
- `POST /api/admin/robot-subscriptions/:id/mentions`：管理员修改已获批机器人的成员配置。
- `POST /api/admin/robot-subscriptions/:id/send`：管理员主动发送该机器人的当日日报。首条请求 `{ "part": 0 }`；`more: true` 时携带返回的 `next_part` 作为 `part`、`version` 和 `date` 继续。每请求一条，仍检查批准并间隔 3.1 秒；新一轮从 `part: 0` 开始，允许重复发送。
- `POST /api/admin/robot-subscriptions/:id/retry`：旧接口返回 410，提示刷新页面使用「立刻发送」。
- `POST /api/admin/robot-subscriptions/:id/reject`：填写 `note` 拒绝或停止推送。

审核接口使用与邮箱相同的 `NEWSLETTER_ADMIN_TOKEN || ADMIN_TOKEN` Bearer 认证。运维接口 `GET /api/admin/robot/status` 使用发布 `ADMIN_TOKEN`，只返回汇总和当日各状态数量；原 `/api/admin/robot/send` 返回定时任务说明，不在 HTTP 请求里批量群发。

日志只记录数量与安全状态码，不能记录 webhook、手机号、正文或供应商原始响应。单元测试与浏览器测试使用示例地址和模拟服务，不向真实群发送测试消息。

连接排查使用 `POST /api/admin/robot/test`，由发布管理员 `ADMIN_TOKEN` 认证，参数为已审核的 `subscriber_id` 和仅由大写字母、数字、连字符组成的 `test_id`。每次仅尝试一条独立连接确认消息，不 @、不自动重试、不读取或修改日报去重记录。响应只返回安全的 HTTP 状态、成功标记和数字状态码；实际群内是否收到仍需管理员核对。真实测试必须由用户明确要求后单次执行。
