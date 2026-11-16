"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  algorithmKey, baselineRow, benchmarkAsset, benchmarkSource, defaultMachine, defaultVersion, displayNumber,
  displayVersion, libraryKey, libraryVersions, operationNames, operations, sizeNames, sizes, speedRows,
  type AlgorithmType, type Benchmark, type BenchmarkRow, type Operation, type Size,
} from "./benchmark";

type ComponentBenchmark = { library: string; parameters: string[] };
type Metric = Operation | Size;
type Column = { key: Metric; name: string };
type Selection = {
  machine: number;
  libraries: number[];
  type: AlgorithmType;
  tab: "ops" | "size";
  group: "algorithms" | "libraries";
  baseline: number;
};
type Sort = { key: Metric; descending: boolean };

const performanceUrl = "/tracking/performance";
const algorithmOrder = ["ML-KEM", "HQC", "ML-DSA", "FALCON", "SLH-DSA", "SPHINCS+"];
let snapshotRequest: Promise<Benchmark> | undefined;

function loadSnapshot() {
  snapshotRequest ??= fetch(benchmarkAsset).then(async response => {
    if (!response.ok) throw new Error("无法读取性能数据");
    return await response.json() as Benchmark;
  }).catch(error => {
    snapshotRequest = undefined;
    throw error;
  });
  return snapshotRequest;
}

function readSelection(snapshot: Benchmark): Selection {
  const params = new URLSearchParams(window.location.search);
  const requestedMachine = snapshot.machines.findIndex(item => item.key === params.get("machine"));
  const machine = requestedMachine < 0 ? defaultMachine(snapshot) : requestedMachine;
  const versions = libraryVersions(snapshot, machine);
  const requested = new Set(params.get("lib")?.split(","));
  const available = [...versions.values()].flat();
  const type = params.get("type") === "DSA" ? "DSA" : "KEM";
  return {
    machine,
    libraries: params.has("lib")
      ? available.filter(index => requested.has(libraryKey(snapshot.libraries[index])))
      : [...versions.values()].map(items => defaultVersion(snapshot, items)),
    type,
    tab: params.get("tab") === "size" ? "size" : "ops",
    group: params.get("groupMode") === "libraries" ? "libraries" : "algorithms",
    baseline: snapshot.algorithms.findIndex(item => item.type === type && algorithmKey(item) === params.get("baseline")),
  };
}

function selectionParams(snapshot: Benchmark, selection: Selection) {
  const params = new URLSearchParams({
    machine: snapshot.machines[selection.machine].key,
    type: selection.type,
    lib: selection.libraries.map(index => libraryKey(snapshot.libraries[index])).join(","),
    tab: selection.tab,
    groupMode: selection.group,
  });
  const baseline = snapshot.algorithms[selection.baseline];
  if (baseline) params.set("baseline", algorithmKey(baseline));
  return params;
}

function columns(type: AlgorithmType, tab: Selection["tab"]): Column[] {
  return tab === "ops"
    ? operations[type].map(key => ({ key, name: operationNames[key] }))
    : sizes[type].map(key => ({ key, name: sizeNames[key] }));
}

function MetricValue({ value, reference }: { value?: number; reference?: number }) {
  if (value == null) return <span aria-label="无数据">—</span>;
  return <>
    <span title={String(value)}>{displayNumber(value)}</span>
    {reference != null && reference > 0 && <small>×{displayNumber(value / reference)}</small>}
  </>;
}

function PerformanceTable({
  snapshot, rows, columns, unit, group, tab, baseline, sort, onSort,
}: {
  snapshot: Benchmark;
  rows: BenchmarkRow[];
  columns: Column[];
  unit: string;
  group: Selection["group"];
  tab: Selection["tab"];
  baseline?: BenchmarkRow["values"];
  sort: Sort | null;
  onSort: (key: Metric) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const sorted = [...rows].sort((a, b) => {
    if (sort) {
      const left = a.values[sort.key];
      const right = b.values[sort.key];
      if (left == null && right != null) return 1;
      if (right == null && left != null) return -1;
      if (left != null && right != null && left !== right) return (sort.descending ? -1 : 1) * (left - right);
    }
    const left = snapshot.algorithms[a.algorithm];
    const right = snapshot.algorithms[b.algorithm];
    const rank = (name: string) => (algorithmOrder.indexOf(name) + 1 || algorithmOrder.length + 1);
    return rank(left.name) - rank(right.name)
      || left.parameters.localeCompare(right.parameters, "en", { numeric: true })
      || a.library - b.library;
  });
  const groups = new Map<string, Map<string, BenchmarkRow[]>>();
  for (const row of sorted) {
    const algorithm = snapshot.algorithms[row.algorithm];
    const library = snapshot.libraries[row.library];
    const name = group === "algorithms" ? algorithm.name : library.name;
    const subgroup = tab === "size" ? "" : group === "algorithms" ? algorithm.parameters : library.version;
    const bucket = groups.get(name) ?? new Map<string, BenchmarkRow[]>();
    const entries = bucket.get(subgroup) ?? [];
    entries.push(row);
    bucket.set(subgroup, entries);
    groups.set(name, bucket);
  }
  const allCollapsed = groups.size > 0 && [...groups.keys()].every(group => collapsed.has(group));
  function toggle(key: string) {
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!rows.length) return <p className="tracking-empty" role="status">当前筛选条件下没有数据。</p>;
  return <div className="tracking-scroll" role="region" aria-label={tab === "ops" ? "运算速度数据" : "数据规模明细"} tabIndex={0}>
    <table className="tracking-benchmark-table">
      <thead><tr>
        <th scope="col">
          {tab === "size" ? "参数集" : group === "libraries" ? "算法参数集" : "密码库与版本"}
          <button className="tracking-collapse" type="button" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.keys()))}>{allCollapsed ? "全部展开" : "全部收起"}</button>
        </th>
        <th scope="col">NIST 等级</th>
        {columns.map(column => <th key={column.key} scope="col" className="numeric"
          aria-sort={sort?.key === column.key ? sort.descending ? "descending" : "ascending" : undefined}>
          <button type="button" onClick={() => onSort(column.key)}>{column.name}<small>{unit}</small></button>
        </th>)}
      </tr></thead>
      <tbody>{[...groups].map(([groupName, subgroups]) => <Fragment key={groupName}>
        <tr className="tracking-benchmark-group"><th colSpan={columns.length + 2} scope="rowgroup">
          <button type="button" aria-expanded={!collapsed.has(groupName)} onClick={() => toggle(groupName)}>
            {groupName}<span>{tab === "size" ? subgroups.get("")?.length : subgroups.size}</span>
          </button>
        </th></tr>
        {!collapsed.has(groupName) && [...subgroups].map(([name, items]) => <Fragment key={name}>
          {name && <tr className="tracking-benchmark-subgroup"><th colSpan={columns.length + 2} scope="rowgroup">
            <button type="button" title={name} aria-expanded={!collapsed.has(groupName + "/" + name)} onClick={() => toggle(groupName + "/" + name)}>
              {displayVersion(name)}<span>{items.length}</span>
            </button>
          </th></tr>}
          {!collapsed.has(groupName + "/" + name) && items.map(row => {
            const algorithm = snapshot.algorithms[row.algorithm];
            const library = snapshot.libraries[row.library];
            return <tr key={row.library + "/" + row.algorithm}>
              <th scope="row">{tab === "size" || group === "libraries" ? algorithm.parameters : <>
                {library.name} <small title={library.version}>{displayVersion(library.version)}</small>
              </>}</th>
              <td>{algorithm.security_level ?? "—"}</td>
              {columns.map(column => <td key={column.key} className="numeric"><MetricValue value={row.values[column.key]} reference={baseline?.[column.key]} /></td>)}
            </tr>;
          })}
        </Fragment>)}
      </Fragment>)}</tbody>
    </table>
  </div>;
}

function ComponentSummary({ snapshot, component }: { snapshot: Benchmark; component: ComponentBenchmark }) {
  const machine = defaultMachine(snapshot);
  const versions = libraryVersions(snapshot, machine).get(component.library);
  if (!versions) return <p>该组件在默认机器上没有性能记录。</p>;
  const version = defaultVersion(snapshot, versions);
  const library = snapshot.libraries[version];
  const rows = speedRows(snapshot, machine).filter(row => row.library === version && component.parameters.includes(snapshot.algorithms[row.algorithm].parameters));
  return <div className="tracking-component-data">
    <p className="meta">{library.name} <span title={library.version}>{displayVersion(library.version)}</span> · {snapshot.machines[machine].cpu_model} · ops/s</p>
    {(["KEM", "DSA"] as const).map(type => {
      const typeRows = rows.filter(row => snapshot.algorithms[row.algorithm].type === type);
      if (!typeRows.length) return null;
      const url = performanceUrl + "?" + selectionParams(snapshot, { machine, type, libraries: [version], tab: "ops", group: "libraries", baseline: -1 });
      return <section key={type}>
        <h3>{type === "KEM" ? "密钥封装" : "数字签名"}</h3>
        <div className="tracking-scroll" role="region" aria-label={type + "运算速度"} tabIndex={0}>
          <table className="tracking-benchmark-table">
            <thead><tr><th scope="col">参数集</th>{operations[type].map(op => <th key={op} scope="col" className="numeric">{operationNames[op]}</th>)}</tr></thead>
            <tbody>{typeRows.map(row => <tr key={row.algorithm}>
              <th scope="row">{snapshot.algorithms[row.algorithm].parameters}</th>
              {operations[type].map(op => <td key={op} className="numeric"><MetricValue value={row.values[op]} /></td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <Link href={url}>在性能评估中查看完整结果 →</Link>
      </section>;
    })}
  </div>;
}

function Explorer({ snapshot }: { snapshot: Benchmark }) {
  const [selection, setSelection] = useState(() => readSelection(snapshot));
  const [sort, setSort] = useState<Sort | null>(null);
  const { machine, tab, type, group, libraries, baseline } = selection;
  const versions = useMemo(() => libraryVersions(snapshot, machine), [snapshot, machine]);
  const measurements = useMemo(() => speedRows(snapshot, machine), [snapshot, machine]);
  const measuredBaseline = tab === "ops" ? baselineRow(snapshot, measurements, baseline) : undefined;
  const baseAlgorithm = snapshot.algorithms[baseline];
  const rows: BenchmarkRow[] = tab === "size"
    ? snapshot.algorithms.flatMap((item, index) => item.type === type && item.pqc ? [{ library: -1, algorithm: index, values: item.sizes }] : [])
    : measurements.filter(row => snapshot.algorithms[row.algorithm].type === type && snapshot.algorithms[row.algorithm].pqc && libraries.includes(row.library));

  useEffect(() => {
    const reconcile = () => setSelection(readSelection(snapshot));
    window.addEventListener("popstate", reconcile);
    return () => window.removeEventListener("popstate", reconcile);
  }, [snapshot]);

  function update(next: Partial<Selection>) {
    const nextSelection = { ...selection, ...next };
    const url = new URL(window.location.href);
    url.search = selectionParams(snapshot, nextSelection).toString();
    window.history.replaceState(window.history.state, "", url);
    setSelection(nextSelection);
  }

  function changeMachine(value: number) {
    const nextVersions = libraryVersions(snapshot, value);
    const chosen = new Set(libraries);
    const next = [...nextVersions].flatMap(([name, items]) => {
      const retained = items.filter(index => chosen.has(index));
      if (retained.length) return retained;
      return libraries.some(index => snapshot.libraries[index].name === name) || !versions.has(name)
        ? [defaultVersion(snapshot, items)]
        : [];
    });
    update({ machine: value, libraries: next });
  }

  function selectVersion(index: number) {
    update({ libraries: libraries.includes(index) ? libraries.filter(item => item !== index) : [...libraries, index] });
  }

  function selectLibrary(name: string, items: number[]) {
    const others = libraries.filter(index => snapshot.libraries[index].name !== name);
    update({ libraries: others.length === libraries.length ? [...others, defaultVersion(snapshot, items)] : others });
  }

  function changeView(next: Partial<Selection>) {
    setSort(null);
    update(next);
  }

  return <section className="tracking-perf" aria-label="基准数据浏览器">
    <div className="tracking-perf-controls">
      <div className="tracking-pills" role="group" aria-label="评估视图">
        <button type="button" aria-pressed={tab === "ops"} onClick={() => changeView({ tab: "ops" })}>运算速度</button>
        <button type="button" aria-pressed={tab === "size"} onClick={() => changeView({ tab: "size" })}>数据规模</button>
      </div>
      <div className="tracking-pills" role="group" aria-label="算法类型">
        <button type="button" aria-pressed={type === "KEM"} onClick={() => changeView({ type: "KEM", baseline: -1 })}>密钥封装 (KEM)</button>
        <button type="button" aria-pressed={type === "DSA"} onClick={() => changeView({ type: "DSA", baseline: -1 })}>数字签名 (DSA)</button>
      </div>
      <div className="tracking-perf-fields">
        {tab === "ops" && <>
          <label>机器型号<select value={machine} onChange={event => changeMachine(Number(event.target.value))}>
            {snapshot.machines.map((item, index) => <option key={item.key} value={index}>{item.cpu_model} ({item.architecture})</option>)}
          </select></label>
          <label>分组依据<select value={group} onChange={event => changeView({ group: event.target.value === "libraries" ? "libraries" : "algorithms" })}>
            <option value="algorithms">算法</option><option value="libraries">密码库</option>
          </select></label>
        </>}
        <label>对比基准<select value={baseline} onChange={event => update({ baseline: Number(event.target.value) })}>
          <option value={-1}>无基准</option>
          {[false, true].map(pqc => <optgroup key={String(pqc)} label={pqc ? "后量子算法" : "传统算法基线"}>
            {snapshot.algorithms.map((item, index) => item.type === type && item.pqc === pqc && <option key={index} value={index}>
              {item.name === "RSA-KEM" ? "RSA-KEM (" + item.parameters + ")" : item.parameters}
            </option>)}
          </optgroup>)}
        </select></label>
      </div>
    </div>

    <p className="tracking-perf-note">
      {tab === "ops" ? "每秒操作次数（ops/s）" : "数据长度（字节）"}
      {measuredBaseline && <span> · 基准实测 {snapshot.libraries[measuredBaseline.library].name} {displayVersion(snapshot.libraries[measuredBaseline.library].version)}</span>}
      {tab === "ops" && baseline >= 0 && !measuredBaseline && <span> · 所选机器没有该基准的测量值</span>}
    </p>
    <div className="tracking-perf-workspace" data-sized={tab === "size" || undefined}>
      {tab === "ops" && <details className="tracking-library-picker" open>
        <summary>密码库版本 <span>{libraries.length}</span></summary>
        <button className="tracking-collapse" type="button" onClick={() => update({ libraries: [...versions.values()].map(items => defaultVersion(snapshot, items)) })}>恢复默认</button>
        {[...versions].map(([name, items]) => <div className="tracking-library" key={name}>
          <label><input type="checkbox" checked={libraries.some(index => snapshot.libraries[index].name === name)} onChange={() => selectLibrary(name, items)} />{name}</label>
          <details><summary>选择版本</summary><ul>{items.map(index => {
            const version = snapshot.libraries[index].version;
            return <li key={version}><label title={version}>
              <input type="checkbox" checked={libraries.includes(index)} onChange={() => selectVersion(index)} aria-label={name + " " + version} />
              {displayVersion(version)}
            </label></li>;
          })}</ul></details>
        </div>)}
      </details>}
      <PerformanceTable key={tab + "/" + group + "/" + type} snapshot={snapshot} rows={rows} columns={columns(type, tab)}
        tab={tab} unit={tab === "ops" ? "ops/s" : "byte"} group={tab === "size" ? "algorithms" : group}
        baseline={tab === "ops" ? measuredBaseline?.values : baseAlgorithm?.sizes} sort={sort}
        onSort={key => setSort(previous => ({ key, descending: previous?.key === key ? !previous.descending : true }))} />
    </div>
    <section className="tracking-perf-method" id="method">
      <h2>测试方法</h2>
      <p>测量使用同一批云服务器及各密码库自带的基准程序，数值单位为 ops/s。工具实现存在差异，宜比较数量级及版本演进。</p>
      {type === "KEM" && <p>X25519 基准使用 OpenSSL 的 DHKEM（RFC 9180），临时公钥按封装密文计入长度。</p>}
      <p>数据生成于 <time dateTime={snapshot.generated_at}>{snapshot.generated_at.slice(0, 10)}</time> · <a href={benchmarkSource} target="_blank" rel="noreferrer">源站公开数据 ↗</a></p>
    </section>
  </section>;
}

export default function BenchmarkExplorer({ component }: { component?: ComponentBenchmark }) {
  const [result, setResult] = useState<Benchmark | "error">();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    loadSnapshot().then(data => { if (mounted) setResult(data); }, () => { if (mounted) setResult("error"); });
    return () => { mounted = false; };
  }, [attempt]);

  if (!result) return <p className="tracking-empty" role="status">正在加载性能数据……</p>;
  if (result === "error") return <p className="tracking-empty" role="status">性能数据加载失败。 <button type="button" onClick={() => { setResult(undefined); setAttempt(value => value + 1); }}>重试</button></p>;
  return component ? <ComponentSummary snapshot={result} component={component} /> : <Explorer snapshot={result} />;
}
