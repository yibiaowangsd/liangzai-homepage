import { build } from "esbuild";
import { resolve } from "node:path";
import type { Plugin } from "vite";

/** Share the transition with the independent, unbundled laboratory HTML pages. */
export function aboutPushAssets(): Plugin {
  return {
    name: "about-push-static-assets",
    async buildStart() {
      await build({
        entryPoints: { static: resolve("app/experience/about-push-static.ts") },
        outdir: resolve("public/assets/about-push"),
        bundle: true, splitting: true, format: "esm", minify: true,
        target: "es2022", logLevel: "warning",
      });
    },
  };
}
