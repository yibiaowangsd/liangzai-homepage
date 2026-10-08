// Explicit educational wire model. No packet capture or runtime algorithm execution here.
export const groups = [
  { name: "X25519", client: 32, server: 32 },
  { name: "X25519 + ML-KEM-512 (材料模型)", client: 832, server: 800 },
  { name: "X25519MLKEM768", client: 1216, server: 1120 },
  { name: "X25519 + ML-KEM-1024 (材料模型)", client: 1600, server: 1600 },
  { name: "MLKEM768", client: 1184, server: 1088 },
] as const;
export const certificates = [
  { name: "RSA-2048", spki: 294, signature: 256 },
  { name: "ECDSA P-256", spki: 91, signature: 72 },
  { name: "ML-DSA-44", spki: 1334, signature: 2420 },
  { name: "ML-DSA-65", spki: 1974, signature: 3309 },
  { name: "ML-DSA-87", spki: 2614, signature: 4627 },
] as const;
function integer(value: number, min: number, max: number, label: string) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`${label}应是 ${min}–${max} 之间的整数`);
}
export function certificateModel(
  index: number,
  chain: number,
  overhead: number,
) {
  integer(index, 0, certificates.length - 1, "证书算法");
  integer(chain, 1, 10, "链长度");
  integer(overhead, 0, 100000, "证书元数据");
  const algorithm = certificates[index];
  const der = overhead + algorithm.spki + algorithm.signature;
  return {
    der,
    chainDer: der * chain,
    certificateMessage: 8 + chain * (der + 5),
    certificateVerify: 8 + algorithm.signature,
  };
}
export function packetModel(input: {
  group: number;
  baseline: number;
  certificate: number;
  chain: number;
  overhead: number;
  mtu: number;
  ipv6: boolean;
  natT: boolean;
  ikeBytes: number;
}) {
  integer(input.group, 0, groups.length - 1, "协商组");
  integer(input.baseline, 50, 60000, "ClientHello 基础长度");
  integer(input.mtu, 256, 9000, "MTU");
  integer(input.ikeBytes, 0, 10000000, "IKE 加密明文");
  const group = groups[input.group];
  const cert = certificateModel(input.certificate, input.chain, input.overhead);
  const hello = input.baseline + 10 + group.client; // extension 4 + vector 2 + group 2 + length 2
  const recordBytes = hello + 5 * Math.ceil(hello / 16384);
  // IP + UDP + optional non-ESP marker + IKE header + SKF generic+fragment fields + explicit IV + GCM tag.
  const ikeOverhead =
    (input.ipv6 ? 40 : 20) + 8 + (input.natT ? 4 : 0) + 28 + 8 + 8 + 16;
  const ikeCapacity = Math.floor((input.mtu - ikeOverhead) / 4) * 4 - 1; // 4-byte alignment and one pad-length octet
  return {
    ...cert,
    hello,
    recordBytes,
    serverKeyExchange: group.server,
    ikeOverhead,
    ikeCapacity,
    ikeFragments:
      input.ikeBytes === 0 ? 0 : Math.ceil(input.ikeBytes / ikeCapacity),
  };
}
