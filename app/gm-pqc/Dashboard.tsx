"use client";
import { useState } from "react";
import data from "../engineering/candidates.json";
import { Table } from "../engineering/EngineeringPage";
const types: Record<string, string> = {
  kem: "KEM",
  sig: "签名",
  kex: "密钥交换",
  hash: "哈希",
};
export default function Dashboard() {
  const [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [status, setStatus] = useState("all");
  const filtered = data.candidates.filter(
    (c) =>
      `${c.name} ${c.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (type === "all" || type === c.type) &&
      (status === "all" ||
        (status === "full"
          ? c.runnable === c.total
          : status === "partial"
            ? c.runnable > 0 && c.runnable < c.total
            : c.runnable === 0)),
  );
  return (
    <>
      <div className="engineering-form">
        <label>
          搜索候选名称或编号
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          算法类型
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">全部类型</option>
            {Object.entries(types).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          接入进度
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="full">全部参数已接入</option>
            <option value="partial">部分参数已接入</option>
            <option value="none">未接入</option>
          </select>
        </label>
      </div>
      <p role="status">
        显示 {filtered.length} / {data.totals.candidates} 个候选
      </p>
      <Table
        caption="接入以当前运行映射及 JS / WASM 配对文件存在为准；不代表安全审查结论"
        heads={["编号 / 候选", "类型", "可运行 / 总参数", "进度", "详情"]}
        rows={filtered.map((c) => [
          `${c.id} · ${c.name}`,
          types[c.type],
          `${c.runnable} / ${c.total}`,
          c.runnable === c.total
            ? "全部接入"
            : c.runnable
              ? "部分接入"
              : "未接入",
          <a key={c.id} href={"/pqc-practice/audit?candidate=" + c.id}>
            接入记录
          </a>,
        ])}
      />
      {filtered.length === 0 && <p>没有符合条件的候选，请调整筛选。</p>}
    </>
  );
}
