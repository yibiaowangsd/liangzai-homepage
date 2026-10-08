export type Parameter = {
  name: string;
  kind: "KEM" | "Signature";
  level: number;
  publicKey: number;
  secretKey: number;
  ciphertext: number | null;
  signature: number | null;
  source: string;
};
const fips = (n: number) => `https://doi.org/10.6028/NIST.FIPS.${n}`;
export const parameters: Parameter[] = [
  ...[
    {
      name: "ML-KEM-512",
      level: 1,
      publicKey: 800,
      secretKey: 1632,
      ciphertext: 768,
    },
    {
      name: "ML-KEM-768",
      level: 3,
      publicKey: 1184,
      secretKey: 2400,
      ciphertext: 1088,
    },
    {
      name: "ML-KEM-1024",
      level: 5,
      publicKey: 1568,
      secretKey: 3168,
      ciphertext: 1568,
    },
  ].map((p) => ({
    ...p,
    kind: "KEM" as const,
    signature: null,
    source: fips(203),
  })),
  ...[
    {
      name: "ML-DSA-44",
      level: 2,
      publicKey: 1312,
      secretKey: 2560,
      signature: 2420,
    },
    {
      name: "ML-DSA-65",
      level: 3,
      publicKey: 1952,
      secretKey: 4032,
      signature: 3309,
    },
    {
      name: "ML-DSA-87",
      level: 5,
      publicKey: 2592,
      secretKey: 4896,
      signature: 4627,
    },
  ].map((p) => ({
    ...p,
    kind: "Signature" as const,
    ciphertext: null,
    source: fips(204),
  })),
  ...["SHA2", "SHAKE"].flatMap((hash) =>
    [
      {
        suffix: "128s",
        level: 1,
        publicKey: 32,
        secretKey: 64,
        signature: 7856,
      },
      {
        suffix: "128f",
        level: 1,
        publicKey: 32,
        secretKey: 64,
        signature: 17088,
      },
      {
        suffix: "192s",
        level: 3,
        publicKey: 48,
        secretKey: 96,
        signature: 16224,
      },
      {
        suffix: "192f",
        level: 3,
        publicKey: 48,
        secretKey: 96,
        signature: 35664,
      },
      {
        suffix: "256s",
        level: 5,
        publicKey: 64,
        secretKey: 128,
        signature: 29792,
      },
      {
        suffix: "256f",
        level: 5,
        publicKey: 64,
        secretKey: 128,
        signature: 49856,
      },
    ].map(({ suffix, ...p }) => ({
      ...p,
      name: `SLH-DSA-${hash}-${suffix}`,
      kind: "Signature" as const,
      ciphertext: null,
      source: fips(205),
    })),
  ),
];
