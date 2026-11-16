export type AlgorithmType = "KEM" | "DSA";
export type Operation = keyof typeof operationNames;
export type Size = keyof typeof sizeNames;

export const operationNames = {
  keygen: "密钥生成", encaps: "封装", decaps: "解封装", sign: "签名", verify: "验签",
};
export const sizeNames = {
  public_key: "公钥", private_key: "私钥", ciphertext: "密文", shared_secret: "共享密钥", signature: "签名",
};
export const operations: Record<AlgorithmType, Operation[]> = {
  KEM: ["keygen", "encaps", "decaps"], DSA: ["keygen", "sign", "verify"],
};
export const sizes: Record<AlgorithmType, Size[]> = {
  KEM: ["public_key", "private_key", "ciphertext", "shared_secret"],
  DSA: ["public_key", "private_key", "signature"],
};

export type Benchmark = {
  generated_at: string;
  machines: { key: string; cpu_model: string; architecture: string }[];
  libraries: { name: string; version: string; measured_at: string }[];
  algorithms: {
    name: string;
    type: AlgorithmType;
    parameters: string;
    pqc: boolean;
    security_level?: number;
    sizes: Partial<Record<Size, number>>;
  }[];
  operations: Operation[];
  // Indices into machines, libraries, algorithms and operations, followed by ops/s.
  results: [machine: number, library: number, algorithm: number, operation: number, value: number][];
};

export type BenchmarkRow = {
  library: number;
  algorithm: number;
  values: Partial<Record<Operation | Size, number>>;
};

export const benchmarkAsset = "/assets/tracking/benchmarks-2026-11-09.json";
export const benchmarkSource = "https://pqc.tencent.com/data/benchmarks/snapshots/perf-snapshot.json";
export const algorithmKey = (algorithm: Benchmark["algorithms"][number]) => algorithm.name + "/" + algorithm.parameters;
export const libraryKey = (library: Benchmark["libraries"][number]) => library.name + "@" + library.version;
const prerelease = /alpha|beta|(^|-|\.)rc\d*($|[-.])|dev|test/i;

export function defaultMachine(snapshot: Benchmark) {
  const counts = snapshot.machines.map(() => 0);
  for (const [machine] of snapshot.results) counts[machine]++;
  return counts.indexOf(Math.max(...counts));
}

export function libraryVersions(snapshot: Benchmark, machine: number) {
  const available = new Set<number>();
  for (const [index, library] of snapshot.results) if (index === machine) available.add(library);

  const result = new Map<string, number[]>();
  const sorted = [...available].sort((a, b) => {
    const left = snapshot.libraries[a];
    const right = snapshot.libraries[b];
    return left.name.localeCompare(right.name) || right.measured_at.localeCompare(left.measured_at);
  });
  for (const index of sorted) {
    const { name } = snapshot.libraries[index];
    const versions = result.get(name) ?? [];
    versions.push(index);
    result.set(name, versions);
  }
  return result;
}

export function defaultVersion(snapshot: Benchmark, versions: number[]) {
  return versions.find(index => !prerelease.test(snapshot.libraries[index].version)) ?? versions[0];
}

export function speedRows(snapshot: Benchmark, machine: number) {
  const rows = new Map<string, BenchmarkRow>();
  for (const [index, library, algorithm, operation, value] of snapshot.results) {
    if (machine !== index) continue;
    const key = library + "/" + algorithm;
    let row = rows.get(key);
    if (!row) {
      row = { library, algorithm, values: {} };
      rows.set(key, row);
    }
    row.values[snapshot.operations[operation]] = value;
  }
  return [...rows.values()];
}

export function baselineRow(snapshot: Benchmark, rows: BenchmarkRow[], algorithm: number) {
  return rows.filter(row => row.algorithm === algorithm).sort((a, b) => {
    const left = snapshot.libraries[a.library];
    const right = snapshot.libraries[b.library];
    return Number(right.name === "openssl") - Number(left.name === "openssl")
      || left.name.localeCompare(right.name)
      || Number(prerelease.test(left.version)) - Number(prerelease.test(right.version))
      || right.measured_at.localeCompare(left.measured_at);
  })[0];
}

export function displayNumber(value: number) {
  return new Intl.NumberFormat("en-US", value < 100 ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: 0 }).format(value);
}

export function displayVersion(version: string) {
  return /^[0-9a-f]{40,64}$/i.test(version) ? version.slice(0, 8) : version;
}
