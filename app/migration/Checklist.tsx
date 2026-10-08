"use client";
import { useSyncExternalStore } from "react";
import { migrationStages } from "../engineering/migration";
import {
  checklistSnapshot,
  serverSnapshot,
  subscribeChecklist,
  saveChecklist,
} from "./checklist-store";
export default function Checklist() {
  const { checked, ready, storage } = useSyncExternalStore(
    subscribeChecklist,
    checklistSnapshot,
    serverSnapshot,
  );
  const setChecked = saveChecklist;
  const download = () => {
    const text =
      "# PQC 迁移检查记录\n\n" +
      migrationStages
        .map(
          (s, i) =>
            "## " +
            s.name +
            "\n\n" +
            s.checks
              .map(
                (c, j) =>
                  "- [" +
                  (checked.includes(i + "-" + j) ? "x" : " ") +
                  "] " +
                  c,
              )
              .join("\n"),
        )
        .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "pqc-migration-progress.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <p role="status">
        已勾选 {checked.length} / 24 项。
        {storage
          ? "仅在此浏览器保存勾选状态。"
          : "浏览器存储不可用，仍可导出当前记录。"}
        勾选不是自动验收结果。
      </p>
      {migrationStages.map((s, i) => (
        <section className="engineering-section" key={s.name}>
          <h2>
            {i + 1}. {s.name}
          </h2>
          <p>{s.goal}</p>
          <p>
            <strong>退出条件：</strong>
            {s.exit}
          </p>
          <ul className="engineering-checks">
            {s.checks.map((c, j) => {
              const id = i + "-" + j;
              return (
                <li key={id}>
                  <label>
                    <input
                      type="checkbox"
                      disabled={!ready}
                      checked={checked.includes(id)}
                      onChange={(e) =>
                        setChecked(
                          e.target.checked
                            ? [...checked, id]
                            : checked.filter((v) => v !== id),
                        )
                      }
                    />
                    <span>{c}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="engineering-actions">
        <button type="button" onClick={download}>
          导出当前勾选记录
        </button>
        <button type="button" onClick={() => setChecked([])}>
          清空勾选
        </button>
      </div>
    </>
  );
}
