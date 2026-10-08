#!/usr/bin/env node
// A loopback SSH daemon and test keys owned by the current user; no system configuration changes.
import net from "node:net";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { spawn, execFileSync, spawnSync } from "node:child_process";
import { userInfo } from "node:os";
import { join, resolve, dirname } from "node:path";
import { performance } from "node:perf_hooks";
const directory = await mkdtemp(join(process.cwd(), ".pqc-ssh-"));
const output = resolve(process.argv[2] || "public/data/ssh-benchmarks.json");
const samples = Number(process.env.BENCH_SAMPLES || 10);
if (!Number.isInteger(samples) || samples < 3 || samples > 100)
  throw new Error("BENCH_SAMPLES must be 3..100");
const version = spawnSync("ssh", ["-V"], { encoding: "utf8" }).stderr;
const supported = execFileSync("ssh", ["-Q", "kex"], { encoding: "utf8" })
  .trim()
  .split("\n");
const variants = [
  "curve25519-sha256",
  "mlkem768x25519-sha256",
  "sntrup761x25519-sha512",
];
const host = join(directory, "host"),
  identity = join(directory, "identity");
const results = [];
let daemon,
  log = "";
try {
  for (const file of [host, identity])
    execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", file]);
  const reserved = net.createServer();
  await new Promise((resolve) => reserved.listen(0, "127.0.0.1", resolve));
  const port = reserved.address().port;
  await new Promise((resolve) => reserved.close(resolve));
  const config = join(directory, "sshd_config");
  await writeFile(
    config,
    `Port ${port}\nListenAddress 127.0.0.1\nHostKey ${host}\nPidFile ${directory}/sshd.pid\nAuthorizedKeysFile ${identity}.pub\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\nUsePAM no\nStrictModes no\nPermitRootLogin no\nAllowUsers ${userInfo().username}\nLogLevel VERBOSE\n`,
    { mode: 0o600 },
  );
  const publicHost = (await readFile(host + ".pub", "utf8"))
    .trim()
    .split(" ")
    .slice(0, 2)
    .join(" ");
  const known = join(directory, "known_hosts");
  await writeFile(known, `[127.0.0.1]:${port} ${publicHost}\n`, {
    mode: 0o600,
  });
  daemon = spawn("/usr/sbin/sshd", ["-D", "-e", "-f", config]);
  daemon.stderr.on("data", (data) => {
    log += data;
  });
  for (let i = 0; i < 50; i++) {
    if (daemon.exitCode !== null) throw new Error(log);
    try {
      await new Promise((resolve, reject) => {
        const s = net.connect(port, "127.0.0.1");
        s.once("connect", () => {
          s.destroy();
          resolve();
        });
        s.once("error", reject);
      });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  for (const kex of variants) {
    if (!supported.includes(kex)) {
      results.push({ kex, status: "unsupported" });
      continue;
    }
    const timings = [];
    let evidence = "";
    for (let i = 0; i < samples + 2; i++) {
      const start = performance.now();
      const client = spawn("ssh", [
        "-F",
        "/dev/null",
        "-vv",
        "-p",
        String(port),
        "-i",
        identity,
        "-o",
        `UserKnownHostsFile=${known}`,
        "-o",
        "StrictHostKeyChecking=yes",
        "-o",
        "BatchMode=yes",
        "-o",
        "IdentitiesOnly=yes",
        "-o",
        "ConnectTimeout=5",
        "-o",
        "ControlMaster=no",
        "-o",
        `KexAlgorithms=${kex}`,
        `${userInfo().username}@127.0.0.1`,
        "printf",
        "pqc-loopback-ok",
      ]);
      let stderr = "",
        stdout = "";
      client.stderr.on("data", (data) => {
        stderr += data;
      });
      client.stdout.on("data", (data) => {
        stdout += data;
      });
      const timeout = setTimeout(() => client.kill("SIGTERM"), 10000);
      const code = await new Promise((resolve) =>
        client.once("close", resolve),
      );
      clearTimeout(timeout);
      if (
        code !== 0 ||
        stdout !== "pqc-loopback-ok" ||
        !stderr.includes("kex: algorithm: " + kex)
      ) {
        results.push({
          kex,
          status: "failed",
          negotiated: stderr.includes("kex: algorithm: " + kex),
          reason: stderr
            .split("\n")
            .filter((line) =>
              /Permission denied|Authentications that can continue/.test(line),
            )
            .join("\n"),
          daemonEvidence: log
            .split("\n")
            .filter((line) =>
              /not allowed|Authentication refused|Could not|Failed publickey|bad ownership|locked/.test(
                line,
              ),
            )
            .slice(-5)
            .map((line) =>
              line
                .replaceAll(directory, "[temporary]")
                .replaceAll(userInfo().username, "local-user"),
            )
            .join("\n"),
        });
        break;
      }
      if (i >= 2) timings.push(performance.now() - start);
      evidence = stderr
        .split("\n")
        .filter(
          (line) =>
            line.includes("kex: algorithm:") ||
            line.includes("Server host key:") ||
            line.includes("Authenticated to "),
        )
        .map((line) => line.replace(userInfo().username, "local-user"))
        .join("\n");
    }
    if (timings.length === samples) {
      const sorted = [...timings].sort((a, b) => a - b);
      results.push({
        kex,
        status: "measured",
        samples,
        medianMs: Number(
          (
            (sorted[Math.floor((sorted.length - 1) / 2)] +
              sorted[Math.floor(sorted.length / 2)]) /
            2
          ).toFixed(3),
        ),
        p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(3)),
        timingsMs: timings,
        evidence,
      });
    }
  }
} catch (error) {
  results.push({
    kex: "daemon",
    status: "unavailable",
    reason: String(error.message).slice(-1800),
  });
} finally {
  if (daemon && daemon.exitCode === null) {
    daemon.kill("SIGTERM");
    await new Promise((resolve) => daemon.once("close", resolve));
  }
  await rm(directory, { recursive: true, force: true });
}
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      environment: {
        client: version.trim() || "OpenSSH (version in daemon log)",
        server: log
          .match(/Server listening[^\n]*/)?.[0]
          ?.replace(/port \d+/, "ephemeral port"),
        platform: process.platform,
        network: "127.0.0.1",
        authentication:
          "ephemeral Ed25519 test keys; host key pinned; current unprivileged account",
        filesystemPolicy:
          "StrictModes=no only for this disposable loopback daemon (cloud container root has nonstandard permissions); file mode 0600/0700; not a production sshd configuration",
        timing:
          "fresh SSH process through authenticated remote printf completion, not isolated KEX latency",
        wire: "wire byte sizes not captured; KEX material sizes in calculator are estimates",
      },
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(results.map((r) => r.kex + ": " + r.status).join("\n"));
if (results.some((r) => r.status !== "measured")) process.exitCode = 1;
