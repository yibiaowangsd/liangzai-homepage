# News publishing pipeline

每日新闻采用“日报 / edition”结构，一天一页。选题与写作详见 [选编规则](editorial-policy.md)，实际检索入口和覆盖方法见 [来源指南](source-guide.md)，[日报任务提示词](daily-automation-prompt.md) 与当前定时任务同步。栏目与版本边界统一定义在 [edition-policy.json](edition-policy.json)。来源指南是运行时检索指导，不代表另建了RSS采集服务。

## 栏目与数量

从 **2026-10-19** 起采用八栏目 v3：`pqc` 后量子算法、`migration` 抗量子迁移、`protocol` 抗量子协议、`standards` 标准动态、`security` 网络安全、`ai` AI 前沿、`ngcc` NGCC 公钥征集，以及同级的 `flash` 快讯。

前七个专题优先 3—5 条；快讯按价值选 0—5 条，不设最低条数；全期最多 40 条；证据不足可为 0—2 条，必须在 `coverage` 写明实际数量及具体原因，不能拿旧闻凑数。`coverage` 必须含全部八栏，不足三条的 `note` 至少 12 字，最多 600 字；各方向均应简记实际检查的代表性机构/入口、来源角色、时间窗、主要排除原因和不可读/待跟进项，即使达到三条也记录；结构校验仍允许正常方向为空，但编辑执行需完整留痕。选编与缺稿说明仅作为内部核验元数据，不显示在网页，也不写入邮件或机器人消息。全期至少一篇；完全无可核实进展则不提交空文件、不删除已有日报。

2026-10-10 及之前无 `schema_version` 的历史文件继续按五方向各五条验证，可幂等重发。已有历史文章和订阅选择不自动改写。2026-10-11 起的七栏 v2 文件继续按原有七栏清单验证，不要求历史稿增加快讯。v3 可用于主动升级历史版，但须完整核验全期；2026-10-11 起的文件不可回退 v1。

## Daily payload v3

下面只展示结构，省略的 `items` 必须填写实际完整条目，不可直接发布此示例：

```json
{
  "schema_version": 3,
  "date": "2026-10-19",
  "coverage": {
    "pqc": {"count": 3, "note": ""},
    "migration": {"count": 3, "note": ""},
    "protocol": {"count": 3, "note": ""},
    "standards": {"count": 3, "note": ""},
    "security": {"count": 3, "note": ""},
    "ai": {"count": 3, "note": ""},
    "ngcc": {"count": 0, "note": "本期未发现可核实的新进展；已核对官方公告及候选安全报告。"},
    "flash": {"count": 0, "note": "已核对各专题公告入口，适合短稿的已核实事件本期为零。"}
  },
  "items": []
}
```

每篇含 `slug`、`title`、`summary`、`content`、`category`、`tags`、`source_name`、`source_url`、`cover_image`、`published_at`、`status`。slug 为当日 `YYYYMMDD-` 开头的小写字母/数字/单连字符，唯一且稳定。前七个专题 `summary` 为 100—180 字；`content` 通常 600—1600 字，至少 600 字符、5 个至少 50 字符的实质段落，开头有 ISO 来源日期，独立 `## 量仔观察` 后至少 80 字针对性分析。快讯 `summary` 为 40—180 字符，`content` 为 80—599 字符，通常 1—3 段，开头同样有 ISO 来源日期；不要求五段或 `## 量仔观察`。禁止重复段落、相同一手 URL 拆条或同一事件同时作长文与快讯，详见选编规则。

`source_url` 使用实际阅读、直接支持核心事实的具体 HTTPS 原始发布、原创调查或原始评测页面，不能为示例链接、首页或聚合入口；技术规格/安全证明/标准状态仍须回到原始技术材料。正文给出其他关键证据的Markdown链接，不改变现有Schema。`tags` 为非空字符串数组，可注明“实现发布”“互通测试”“部署实践”等实际事件类型。`cover_image` 可为 null，流水线抓取原文社交配图，失败使用相应栏目已有图片。`published_at` 用本站实际发布时间 ISO8601，全期均属同一北京时间日期；来源日期写正文，`status` 必须为 `published`。

## 发布与完整性

1. 读取 main 最新规则、来源指南、发布流程和近 7 期数据，必要时查 30 天及 API，先做八栏多来源检索，再核对选题价值、集中性与事件去重。API 分页始终一天一页，`pageSize=3` 不会返回三期，须逐页读取。
2. 生成完整 `news/inbox/YYYY-MM-DD.json`，当天文件已有时先读最新版本再整体替换，保留未改事件的 slug。仅提交新闻数据文件。
3. 运行 `python3 news/validate-edition.py news/inbox/YYYY-MM-DD.json`。v3 检查八栏与体裁差异，v2 保持七栏，v1 历史版检查 5×5；同时检查数量、覆盖说明、日期与原文链接。
4. `.github/workflows/publish-news.yml` 验证并提取配图，调用 `POST https://api.wangyibiao.com/api/admin/news/batch`。
5. Worker 再核验日期、分类、数量、slug 与 coverage，将文章 upsert、移除同日不再出现的旧 published 条目、写入 `news_editions` 清单放在一个 D1 batch 事务中。失败整体回滚；新条目 insert，变更 update，完全相同 skip，过期同日条目 removed。
6. `/api/news/editions?page=N&pageSize=1` 返回一整天，v2/v3 还返回 `schema_version` 和 `coverage`；前端显示实际条数和新闻内容，不展示 `coverage.note`。所有日期以北京时间分组。来源日期与本站发布日期分开。
7. 邮件和机器人对照已提交清单与实际完整条目判定可发送，不再要求每类至少五条。`coverage.note` 仅用于内部核验，不进入邮件或机器人正文；保留已有审核、确认、退订和防重复机制。新增栏目需由订阅者自行选择，不扩大现有订阅。发布任务不主动调用发送端点。
8. 提交后检查对应 Publish news to Cloudflare D1 的最终状态、inserted/updated/skipped/removed，并核对 API 全期实际数量、八类计数与 coverage；commit 成功不等于网站发布成功。失败查日志修正数据后重试，不为凑数或绕过校验改代码。

## 运行配置

仓库 `NEWS_ADMIN_TOKEN` 与 Worker 的 `ADMIN_TOKEN` 匹配。部署通过既有 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`；不得查看、输出、写入或提交密钥值。迁移脚本随 Worker 部署应用，`0008_flash_editions.sql` 在保留历史清单后启用 v3。

群机器人和邮件配置见 [机器人日报](../news-worker/ROBOT.md)、[邮件订阅](../news-worker/SUBSCRIPTIONS.md)。既有审核与加密配置保持，文章编辑不授权向新收件人发送消息。

## 验证

```bash
python3 news/validate-edition.py news/inbox/*.json
node --experimental-strip-types --test tests/news-edition-publishing.test.mjs tests/news-editions-api.test.mjs tests/news-robot.test.mjs tests/news-subscriptions.test.mjs
```

结构校验不能替代一手阅读、事实核验、选题多样性和版权检查。

## 更新时刻、事件优先级与周报

北京时间（Asia/Shanghai）每日08:10启动日报更新；每周五08:10另启动周报。生成、核验与发布完成后推送，08:10是任务启动时刻，不承诺抓取与核验瞬时完成。Worker每小时10、40分检查最新完整清单，08:10前不启动当日定时投递。

自2026-10-22起日报每条必须有`priority`（P1重大/P2重要/P3关注）和8—300字`priority_reason`。依据证据、影响范围、紧迫性分级，各栏按优先级排序，不按配额分级。发布时同步生成既有tags中的`P1·重大`等标签，供网页、邮件、机器人及补发快照一致读取；原始分级理由保留在日报JSON。历史稿不追溯打分。

周报使用独立的`news/weekly/YYYY-MM-DD.json`和D1周报表，不写入或覆盖同日日报。窗口为上周五08:10（含）至本周五08:10（不含），八栏目及事实/来源/去重规则与日报一致，将同一事件的一周变化合并解释。每条有优先级、分级理由及`front_page`布尔值，P1/P2才可入头版，头条可以多个，不与其余新闻重复。没有合格头条不凑数。

`news/weekly-automation-prompt.md`为周报任务同步副本；完整结构和运行规则见[周报说明](weekly/README.md)。用`node news/validate-weekly.mjs news/weekly/YYYY-MM-DD.json`校验；`publish-weekly.yml`发布并回读核验。网页入口为`/news/weekly?date=YYYY-MM-DD`，API为`/api/news/weekly?date=YYYY-MM-DD`。已有获批且有效的邮箱和群机器人按原板块接收，退订/撤销继续立即生效；日报和周报分别去重。
