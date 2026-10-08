#!/usr/bin/env node
// Own loopback TLS endpoint, verified ephemeral CA, no production traffic or keys.
import tls from "node:tls";
import net from "node:net";
import { constants, X509Certificate } from "node:crypto";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { tmpdir, cpus, totalmem } from "node:os";
import { join, resolve, dirname } from "node:path";
import { performance } from "node:perf_hooks";

const samples = Number(process.env.BENCH_SAMPLES || 20);
if (!Number.isInteger(samples) || samples < 3 || samples > 200)
  throw new Error("BENCH_SAMPLES must be 3..200");
const output = resolve(
  process.argv[2] || "public/data/protocol-benchmarks.json",
);
const directory = await mkdtemp(join(tmpdir(), "pqc-tls-"));
const version = execFileSync("openssl", ["version"], {
  encoding: "utf8",
}).trim();
const listen = (server) =>
  new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve(server.address().port);
    });
  });
const close = (server) => new Promise((resolve) => server.close(resolve));
function records(buffer) {
  let offset = 0,
    count = 0;
  const handshake = [];
  while (offset + 5 <= buffer.length) {
    const length = buffer.readUInt16BE(offset + 3);
    if (offset + 5 + length > buffer.length) break;
    if (buffer[offset] === 22)
      handshake.push({ type: buffer[offset + 5], bytes: length });
    count++;
    offset += 5 + length;
  }
  return { count, handshake };
}
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    (sorted[Math.floor((sorted.length - 1) / 2)] +
      sorted[Math.floor(sorted.length / 2)]) /
    2
  );
};
const cases = [
  {
    id: "classic",
    label: "经典",
    group: "X25519",
    certificate: "EC",
    auth: "ECDSA P-256",
  },
  {
    id: "hybrid",
    label: "混合",
    group: "X25519MLKEM768",
    certificate: "EC",
    auth: "ECDSA P-256",
  },
  {
    id: "pqc",
    label: "纯 PQC 协商与认证",
    group: "MLKEM768",
    certificate: "ML-DSA-65",
    auth: "ML-DSA-65",
  },
];
const results = [];
const interoperability = [];
try {
  for (const profile of cases) {
    const keyPath = join(directory, profile.id + ".key"),
      certPath = join(directory, profile.id + ".crt");
    try {
      execFileSync(
        "openssl",
        [
          "req",
          "-x509",
          "-newkey",
          profile.certificate,
          ...(profile.certificate === "EC"
            ? ["-pkeyopt", "ec_paramgen_curve:P-256"]
            : []),
          "-keyout",
          keyPath,
          "-out",
          certPath,
          "-days",
          "1",
          "-nodes",
          "-subj",
          "/CN=localhost",
          "-addext",
          "subjectAltName=DNS:localhost,IP:127.0.0.1",
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      const cert = await readFile(certPath),
        key = await readFile(keyPath);
      let serverReady;
      const server = tls.createServer(
        {
          cert,
          key,
          minVersion: "TLSv1.3",
          maxVersion: "TLSv1.3",
          ecdhCurve: profile.group,
          secureOptions: constants.SSL_OP_NO_TICKET,
        },
        (socket) => {
          socket.on("error", () => {});
          if (serverReady) serverReady();
        },
      );
      server.on("tlsClientError", () => {});
      const serverPort = await listen(server);
      let stream;
      const connections = new Set();
      const proxy = net.createServer((socket) => {
        connections.add(socket);
        const upstream = net.connect(serverPort, "127.0.0.1");
        connections.add(upstream);
        socket.on("data", (data) => stream?.client.push(Buffer.from(data)));
        upstream.on("data", (data) => stream?.server.push(Buffer.from(data)));
        socket.on("error", () => {});
        upstream.on("error", () => {});
        socket.pipe(upstream).pipe(socket);
        socket.on("close", () => connections.delete(socket));
        upstream.on("close", () => connections.delete(upstream));
      });
      const proxyPort = await listen(proxy);
      try {
        const timings = [],
          measurements = [];
        for (let index = 0; index < samples + 3; index++) {
          stream = { client: [], server: [] };
          let onServer;
          const accepted = new Promise((resolve) => {
            onServer = resolve;
          });
          serverReady = onServer;
          const started = performance.now();
          const client = tls.connect({
            port: proxyPort,
            host: "127.0.0.1",
            servername: "localhost",
            ca: cert,
            minVersion: "TLSv1.3",
            maxVersion: "TLSv1.3",
            ecdhCurve: profile.group,
          });
          client.setTimeout(10000, () =>
            client.destroy(new Error("TLS handshake timeout")),
          );
          try {
            await new Promise((resolve, reject) => {
              client.once("secureConnect", resolve);
              client.once("error", reject);
            });
            const ms = performance.now() - started;
            if (!client.authorized || client.getProtocol() !== "TLSv1.3")
              throw new Error("Protocol/certificate verification failed");
            await Promise.race([
              accepted,
              new Promise((_, reject) => {
                const timer = setTimeout(
                  () => reject(new Error("Server handshake timeout")),
                  10000,
                );
                timer.unref();
              }),
            ]);
            await new Promise((resolve) => setImmediate(resolve));
            if (index >= 3) {
              timings.push(ms);
              const c = Buffer.concat(stream.client),
                s = Buffer.concat(stream.server);
              measurements.push({
                clientBytes: c.length,
                serverBytes: s.length,
                clientRecords: records(c).count,
                serverRecords: records(s).count,
                clientHelloBytes:
                  records(c).handshake.find((item) => item.type === 1)?.bytes ??
                  null,
                serverHelloBytes:
                  records(s).handshake.find((item) => item.type === 2)?.bytes ??
                  null,
              });
            }
          } finally {
            client.destroy();
            for (const connection of connections) connection.destroy();
          }
        }
        const measured = measurements[0];
        results.push({
          ...profile,
          status: "measured",
          samples,
          warmup: 3,
          medianMs: Number(median(timings).toFixed(3)),
          p95Ms: Number(
            [...timings]
              .sort((a, b) => a - b)
              [Math.ceil(timings.length * 0.95) - 1].toFixed(3),
          ),
          minMs: Number(Math.min(...timings).toFixed(3)),
          certificateDerBytes: new X509Certificate(cert).raw.length,
          ...measured,
          wireBytesStable: measurements.every(
            (m) =>
              m.clientBytes === measured.clientBytes &&
              m.serverBytes === measured.serverBytes,
          ),
          measurements,
          timingsMs: timings,
        });
        interoperability.push({
          client: `Node ${process.version}`,
          server: `Node ${process.version}`,
          group: profile.group,
          status: "passed",
          authentication: profile.auth,
        });
        const openssl = spawn(
          "openssl",
          [
            "s_client",
            "-connect",
            `127.0.0.1:${serverPort}`,
            "-servername",
            "localhost",
            "-CAfile",
            certPath,
            "-groups",
            profile.group,
            "-tls1_3",
            "-brief",
          ],
          { stdio: ["pipe", "pipe", "pipe"] },
        );
        let evidence = "";
        openssl.stderr.on("data", (chunk) => {
          evidence += chunk;
        });
        openssl.stdout.on("data", () => {});
        const timer = setTimeout(() => openssl.kill("SIGTERM"), 10000);
        openssl.stdin.end();
        const code = await new Promise((resolve) =>
          openssl.once("close", resolve),
        );
        clearTimeout(timer);
        const verified =
          code === 0 &&
          /Verification: OK/.test(evidence) &&
          /TLSv1.3/.test(evidence);
        interoperability.push({
          client: version,
          server: `Node ${process.version}`,
          group: profile.group,
          status: verified ? "passed" : "failed",
          authentication: profile.auth,
          evidence: evidence.trim(),
        });
      } finally {
        for (const connection of connections) connection.destroy();
        await close(proxy);
        await close(server);
      }
    } catch (error) {
      results.push({
        ...profile,
        status: "unsupported",
        reason: String(error.message).slice(0, 1000),
      });
    }
  }
  const report = {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    environment: {
      node: process.version,
      openssl: version,
      nodeOpenSSL: process.versions.openssl,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
      memoryBytes: totalmem(),
      network: "127.0.0.1, no injected latency",
      certificate:
        "self-issued one-day localhost test certificates; CA verified",
      resumption: "fresh connections; no client session reuse",
      timing:
        "client connect start to secureConnect, including TCP; 3 warmups; no application payload",
      wire: "proxy byte counters through server secureConnection; TLS headers and any observed tickets included; not an IP capture",
      fragmentation:
        "TLS record counts observed; MTU segmentation in the UI is an estimate",
    },
    results,
    interoperability,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    results
      .map(
        (r) =>
          `${r.group}: ${r.status}${r.medianMs ? ` median ${r.medianMs} ms` : ""}`,
      )
      .join("\n"),
  );
  console.log(output);
  if (
    results.some((r) => r.status !== "measured") ||
    interoperability.some((r) => r.status === "failed")
  )
    process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
