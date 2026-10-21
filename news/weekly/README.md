# 周报数据与发布

每周五北京时间08:10启动生成，覆盖上周五08:10（含）至本周五08:10（不含）。八个栏目与日报同级，每栏0—5条，总数1—40；同一事件的一周变化合并，独立核验，不简单拼接日报。完整规则及作者指令见[周报任务提示词](../weekly-automation-prompt.md)。

文件命名为`YYYY-MM-DD.json`，日期为该周五。结构：

```json
{
  "schema_version": 1,
  "kind": "weekly",
  "date": "2026-10-23",
  "period_start": "2026-10-16T08:10:00+08:00",
  "period_end": "2026-10-23T08:10:00+08:00",
  "summary": "80—2000字的一周趋势与跟进建议",
  "coverage": {
    "pqc": { "count": 1, "note": "12—600字的实际检索范围与限制" }
  },
  "items": [
    {
      "slug": "20261023-weekly-event-name",
      "title": "事件标题，最多300字",
      "summary": "40—500字的事件摘要",
      "content": "专题600—12000字，快讯80—12000字，说明一周变化、机制、证据、局限与影响",
      "category": "pqc",
      "source_name": "原始发布方",
      "source_url": "https://原始来源/实际已读的具体页面",
      "event_at": "2026-10-22T10:00:00+08:00",
      "priority": "P1",
      "priority_reason": "8—300字说明证据、影响范围及紧迫程度",
      "front_page": true
    }
  ]
}
```

以上仅为结构说明，`coverage`实际必须包含pqc、migration、protocol、standards、security、ai、ngcc、flash八栏，计数与items一致。日期不明或边界日无法确定归属的事件暂缓，不能伪造时间。

`P1`重大、`P2`重要、`P3`关注。每条必须分级，`front_page`必须为布尔值；头版可有多个P1/P2，也可为零，不按数量配额分配。头条不在其余栏目重复。

发布前运行：

```bash
node news/validate-weekly.mjs news/weekly/YYYY-MM-DD.json
```

提交到main后，`Publish weekly news report`工作流校验、调用`POST /api/admin/news/weekly`并回读完整报告。周报保存在独立表，不覆盖同日日报。`GET /api/news/weekly`读取最新一期，`?date=YYYY-MM-DD`读取指定期；网页在`/news/weekly`。发布不会立即向群发送测试消息，下一轮Cron按已审核配置投递。

机器人依次发送“头版头条”和“其余新闻 · 栏目”，每条为优先级、标题、直接原文链接；头版可多条事件或多条消息。超长版面按事件边界拆分，只在本份周报首条执行原有@规则。邮箱同样分版。每日、每周采用独立投递键，重试保留冻结快照与游标，撤销或退订阻止未发内容。
