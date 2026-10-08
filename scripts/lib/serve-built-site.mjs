import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".bin": "application/octet-stream",
  ".mp3": "audio/mpeg",
  ".csv": "text/csv;charset=utf-8",
  ".md": "text/markdown;charset=utf-8",
};
export async function serveBuiltSite() {
  const { default: worker } = await import("../../dist/server/index.js");
  const clientRoot = resolve("dist/client");
  async function asset(input) {
    const file = resolve(
      clientRoot,
      "." +
        decodeURIComponent(
          new URL(typeof input === "string" ? input : input.url).pathname,
        ),
    );
    if (!file.startsWith(clientRoot + sep))
      return new Response(null, { status: 404 });
    try {
      if (!(await stat(file)).isFile())
        return new Response(null, { status: 404 });
      return new Response(await readFile(file), {
        headers: {
          "Content-Type": types[extname(file)] || "application/octet-stream",
        },
      });
    } catch (error) {
      if (error.code === "ENOENT") return new Response(null, { status: 404 });
      throw error;
    }
  }
  const server = createServer(async (incoming, outgoing) => {
    try {
      const request = new Request(
        `http://${incoming.headers.host}${incoming.url}`,
        { headers: incoming.headers },
      );
      const file = await asset(request);
      const response =
        file.status === 404
          ? await worker.fetch(
              request,
              { ASSETS: { fetch: asset } },
              {
                waitUntil(p) {
                  void p.catch(console.error);
                },
                passThroughOnException() {},
              },
            )
          : file;
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.writeHead(500);
      outgoing.end(String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
