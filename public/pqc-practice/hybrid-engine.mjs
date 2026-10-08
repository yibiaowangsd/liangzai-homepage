const bytes = (...arrays) => {
  const result = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
};
const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const digest = async (value) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", value));
const fingerprint = async (value) =>
  [...(await digest(value))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
const info = new TextEncoder().encode(
  "yibiao-hybrid-demo-v1|Alice-client|Bob-server|X25519+ML-KEM-768",
);
export class HybridDemo {
  constructor(module) {
    this.module = module;
    this.stage = 0;
    this.secrets = [];
    this.mode = "normal";
  }
  arena(operation) {
    const m = this.module,
      allocations = [];
    const alloc = (size) => {
      const p = m._malloc(size);
      if (!p) throw new Error("WASM allocation failed");
      allocations.push([p, size]);
      return p;
    };
    try {
      return operation({
        alloc,
        put: (p, data) => m.HEAPU8.set(data, p),
        get: (p, n) => Uint8Array.from(m.HEAPU8.subarray(p, p + n)),
      });
    } finally {
      for (const [p, n] of allocations) {
        m.HEAPU8.fill(0, p, p + n);
        m._free(p);
      }
    }
  }
  async next(mode = "normal") {
    if (!crypto.subtle)
      throw new Error("Secure-context Web Crypto is required");
    if (this.stage === 0) {
      if (!["normal", "ciphertext", "context"].includes(mode))
        throw new Error("Unknown experiment");
      this.mode = mode;
      if (!this.module) {
        const { default: factory } = await import("./wasm/mlkem768shake.mjs");
        this.module = await factory({
          locateFile: (name) => new URL("./wasm/" + name, import.meta.url).href,
        });
      }
      if (
        this.module._lab_public_bytes() !== 1184 ||
        this.module._lab_private_bytes() !== 2400 ||
        this.module._lab_output_bytes() !== 1088
      )
        throw new Error("Unexpected module parameter sizes");
      this.alice = await crypto.subtle.generateKey({ name: "X25519" }, false, [
        "deriveBits",
      ]);
      this.bob = await crypto.subtle.generateKey({ name: "X25519" }, false, [
        "deriveBits",
      ]);
      this.aPublic = new Uint8Array(
        await crypto.subtle.exportKey("raw", this.alice.publicKey),
      );
      this.bPublic = new Uint8Array(
        await crypto.subtle.exportKey("raw", this.bob.publicKey),
      );
      const pair = this.arena((a) => {
        const pk = a.alloc(1184),
          sk = a.alloc(2400);
        if (this.module._lab_keypair(pk, sk) !== 0)
          throw new Error("ML-KEM key generation failed");
        return { pk: a.get(pk, 1184), sk: a.get(sk, 2400) };
      });
      this.pk = pair.pk;
      this.sk = pair.sk;
      this.secrets.push(this.sk);
      this.stage++;
      return {
        stage: this.stage,
        title: "双方生成临时材料",
        alicePublic: await fingerprint(this.aPublic),
        bobPublic: await fingerprint(this.bPublic),
        kemPublic: await fingerprint(this.pk),
        detail:
          "Alice 持有 X25519 私钥与 ML-KEM 私钥；Bob 持有 X25519 私钥。私钥不传出 Worker。",
      };
    }
    if (this.stage === 1) {
      this.stage++;
      return {
        stage: this.stage,
        title: "Alice → Bob：公开材料",
        detail:
          "传递 X25519 公钥 32 B + ML-KEM-768 公钥 1,184 B，共 1,216 B；仅在浏览器内交付。",
      };
    }
    if (this.stage === 2) {
      this.ecA = new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "X25519", public: this.bob.publicKey },
          this.alice.privateKey,
          256,
        ),
      );
      this.ecB = new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "X25519", public: this.alice.publicKey },
          this.bob.privateKey,
          256,
        ),
      );
      this.secrets.push(this.ecA, this.ecB);
      const encapsulation = this.arena((a) => {
        const pk = a.alloc(1184),
          ct = a.alloc(1088),
          ss = a.alloc(32);
        a.put(pk, this.pk);
        if (this.module._lab_enc(ct, ss, pk) !== 0)
          throw new Error("Encapsulation failed");
        return { ct: a.get(ct, 1088), ss: a.get(ss, 32) };
      });
      this.ct = encapsulation.ct;
      this.kemB = encapsulation.ss;
      this.secrets.push(this.kemB);
      this.stage++;
      return {
        stage: this.stage,
        title: "Bob 封装，双方计算 X25519",
        detail:
          "真实运行两个算法：X25519 共享秘密各 32 B，Bob 获得 ML-KEM 共享秘密 32 B 和密文 1,088 B。",
        x25519Matches: equal(this.ecA, this.ecB),
      };
    }
    if (this.stage === 3) {
      this.received = Uint8Array.from(this.ct);
      if (this.mode === "ciphertext") this.received[0] ^= 1;
      this.stage++;
      return {
        stage: this.stage,
        title: "Bob → Alice：公开响应",
        detail: "Bob 的 X25519 公钥 32 B + ML-KEM 密文 1,088 B，共 1,120 B。",
        ciphertext: await fingerprint(this.received),
        tampered: this.mode === "ciphertext",
      };
    }
    if (this.stage === 4) {
      this.kemA = this.arena((a) => {
        const sk = a.alloc(2400),
          ct = a.alloc(1088),
          ss = a.alloc(32);
        a.put(sk, this.sk);
        a.put(ct, this.received);
        if (this.module._lab_dec(ss, ct, sk) !== 0)
          throw new Error("Decapsulation failed");
        return a.get(ss, 32);
      });
      this.secrets.push(this.kemA);
      this.stage++;
      return {
        stage: this.stage,
        title: "Alice 解封装",
        detail:
          "ML-KEM 的隐式拒绝可能返回另一个秘密；函数成功不代表密文未被改动。",
        kemMatches: equal(this.kemA, this.kemB),
      };
    }
    if (this.stage === 5) {
      // Each peer binds its own observed transcript. This pedagogical schedule is NOT TLS 1.3.
      const saltA = await digest(
        bytes(this.aPublic, this.bPublic, this.pk, this.received),
      );
      const saltB = await digest(
        bytes(this.aPublic, this.bPublic, this.pk, this.ct),
      );
      const derive = async (ec, kem, salt, context) => {
        const ikm = bytes(ec, kem);
        this.secrets.push(ikm);
        const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
          "deriveBits",
        ]);
        return new Uint8Array(
          await crypto.subtle.deriveBits(
            { name: "HKDF", hash: "SHA-256", salt, info: context },
            key,
            256,
          ),
        );
      };
      const outputA = await derive(this.ecA, this.kemA, saltA, info);
      const outputB = await derive(
        this.ecB,
        this.kemB,
        saltB,
        this.mode === "context"
          ? new TextEncoder().encode("different-protocol-context")
          : info,
      );
      this.secrets.push(outputA, outputB);
      this.stage++;
      const result = {
        stage: this.stage,
        title: "组合 → HKDF → 核对",
        detail:
          "IKM = X25519 ss || ML-KEM ss（64 B）；salt = SHA-256(固定顺序公开 transcript)；info 绑定实验版本、算法和角色；派生 32 B。",
        matches: equal(outputA, outputB),
        aliceKeyFingerprint: await fingerprint(outputA),
        bobKeyFingerprint: await fingerprint(outputB),
        transcriptFingerprint: await fingerprint(saltA),
      };
      this.clear();
      return result;
    }
    throw new Error("Experiment complete; reset to run again");
  }
  clear() {
    for (const s of this.secrets) s.fill(0);
    this.secrets = [];
    this.alice = this.bob = null;
  }
}
