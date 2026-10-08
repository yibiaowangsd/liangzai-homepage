import { pageMetadata } from "../site/metadata";
import ArsenalLab from "./ArsenalLab";

export const metadata = pageMetadata("密码图鉴", "ML-KEM、ML-DSA、SLH-DSA、FN-DSA 的数学原理、参数与工程关注。", "/pqc-arsenal", "guide");

export default function PqcArsenalPage() {
  return <ArsenalLab />;
}
