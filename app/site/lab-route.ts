export function laboratoryTarget(params: Record<string, string | string[] | undefined>, en = false) {
  const query = new URLSearchParams();
  const tab = params.tab;
  const algorithm = params.algorithm;
  if (typeof tab === "string" && ["kem", "signature", "candidates"].includes(tab)) query.set("tab", tab);
  if (typeof algorithm === "string" && ["ml-kem", "ml-dsa", "slh-dsa"].includes(algorithm)) query.set("algorithm", algorithm);
  return `/pqc-practice/index${en ? "-en" : ""}.html${query.size ? "?" + query : ""}`;
}
