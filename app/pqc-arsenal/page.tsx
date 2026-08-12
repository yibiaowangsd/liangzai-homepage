import type { Metadata } from "next";
import ArsenalLab from "./ArsenalLab";

export const metadata: Metadata = {
  title: "PQC 武器库 · 量仔档案馆",
  description: "跟随量仔从零理解 ML-KEM、ML-DSA、SLH-DSA 与 FN-DSA。",
};

export default function PqcArsenalPage() {
  return <ArsenalLab />;
}
