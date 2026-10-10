# News publishing pipeline

每日新闻采用“日报 / edition”结构，一天一页。选题与写作详见 [选编规则](editorial-policy.md)，栏目与版本边界统一定义在 [edition-policy.json](edition-policy.json)。

## 栏目与数量

从 **2026-10-11** 起采用七方向 v2：`pqc` 后量子算法、`migration` 抗量子迁移、`protocol` 抗量子协议、`standards` 标准动态、`security` 网络安全、`ai` AI 前沿、`ngcc` NGCC 公钥征集。

各方向优先 3—5 条，通常 21—35 条；证据不足可为 0—2 条，必须在 `coverage` 写明实际数量及具体原因，不能拿旧闻凑数。`coverage` 必须含全部七方向，不足三条的 `note` 至少 12 字，最多 600 字；正常方向可用空字符串，也可说明范围或资料限制。选编与缺稿说明仅作为内部核验元数据，不显示在网页，也不写入邮件或机器人消息。全期至少一篇；完全无可核实进展则不提交空文件、不删除已有日报。

2026-10-10 及之前无 `schema_version` 的历史文件继续按五方向各五条验证，可幂等重发。已有历史文章和订阅选择不自动改写。v2 可用于主动升级历史版，但须完整核验全期；未来日期不可回退 v1。

## Daily payload v2

下面只展示结构，省略的 `items` 必须填写实际完整条目，不可直接发布此示例：

```json
{
  "schema_version": 2,
  "date": "2026-10-11",
  "coverage": {
    "pqc": {"count": 3, "note": ""},
    "migration": {"count": 3, "note": ""},
    "protocol": {"count": 3, "note": ""},
    "standards": {"count": 3, "note": ""},
    "security": {"count": 3, "note": ""},
    "ai": {"count": 3, "note": ""},
    "ngcc": {"count": 0, "note": "本期未发现可核实的新进展；已核对官方公告及候选安全报告。"}
  },
  "items": []
}
```

每篇含 `slug`、`title`、`summary`、`content`、`category`、`tags`、`source_name`、`source_url`、`cover_image`、`published_at`、`status`。slug 为当日 `YYYYMMDD-` 开头的小写字母/数字/单连字符，唯一且稳定。`summary` 为 100—180 字；`content` 通常 600—1600 字，至少 600 字符、5 个至少 50 字符的实质段落，开头有 ISO 来源日期，独立 `## 量仔观察` 后至少 80 字针对性分析。禁止重复段落或相同一手 URL 拆条，详见选编规则。

`source_url` 使用实际阅读的一手 HTTPS 原文，不能为示例链接。`tags` 为非空字符串数组，可注明“实现发布”“互通测试”“部署实践”等实际事件类型。`cover_image` 可为 null，流水线抓取原文社交配图，失败使用相应栏目已有图片。`published_at` 用本站实际发布时间 ISO8601，全期均属同一北京时间日期；来源日期写正文，`status` 必须为 `published`。

## 发布与完整性

1. 读取 main 最新规则、发布流程和近 7 期数据，必要时查 30 天及 API，核对选题去重。API 分页始终一天一页，`pageSize=3` 不会返回三期，须逐页读取。
2. 生成完整 `news/inbox/YYYY-MM-DD.json`，当天文件已有时先读最新版本再整体替换，保留未改事件的 slug。仅提交新闻数据文件。
3. 运行 `python3 news/validate-edition.py news/inbox/YYYY-MM-DD.json`。v2 检查七方向、数量与缺稿说明，历史版检查 5×5；同时检查长文结构、日期和原文链接。
4. `.github/workflows/publish-news.yml` 验证并提取配图，调用 `POST https://api.wangyibiao.com/api/admin/news/batch`。
5. Worker 再核验日期、分类、数量、slug 与 coverage，将文章 upsert、移除同日不再出现的旧 published 条目、写入 `news_editions` 清单放在一个 D1 batch 事务中。失败整体回滚；新条目 insert，变更 update，完全相同 skip，过期同日条目 removed。
6. `/api/news/editions?page=N&pageSize=1` 返回一整天，v2 还返回 `schema_version` 和 `coverage`；前端显示实际条数和新闻内容，不展示 `coverage.note`。所有日期以北京时间分组。来源日期与本站发布日期分开。
7. 邮件和机器人对照已提交清单与实际完整条目判定可发送，不再要求每类至少五条。`coverage.note` 仅用于内部核验，不进入邮件或机器人正文；保留已有审核、确认、退订和防重复机制。新增栏目需由订阅者自行选择，不扩大现有订阅。发布任务不主动调用发送端点。
8. 提交后检查对应 Publish news to Cloudflare D1 的最终状态、inserted/updated/skipped/removed，并核对 API 全期实际数量、七类计数与 coverage；commit 成功不等于网站发布成功。失败查日志修正数据后重试，不为凑数或绕过校验改代码。

## 运行配置

仓库 `NEWS_ADMIN_TOKEN` 与 Worker 的 `ADMIN_TOKEN` 匹配。部署通过既有 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`；不得查看、输出、写入或提交密钥值。迁移脚本 `news-worker/migrations/0005_news_editions.sql` 随 Worker 部署应用。

群机器人和邮件配置见 [机器人日报](../news-worker/ROBOT.md)、[邮件订阅](../news-worker/SUBSCRIPTIONS.md)。既有审核与加密配置保持，文章编辑不授权向新收件人发送消息。

## 验证

```bash
python3 news/validate-edition.py news/inbox/*.json
node --experimental-strip-types --test tests/news-edition-publishing.test.mjs tests/news-editions-api.test.mjs tests/news-robot.test.mjs tests/news-subscriptions.test.mjs
```

结构校验不能替代一手阅读、事实核验、选题多样性和版权检查。
