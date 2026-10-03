import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "dist/**",
    ".sites-runtime/**",
    // Generated bundles and Emscripten glue; lint their source instead.
    "public/assets/about-push/**",
    "public/pqc-practice/about-push/**",
    "public/pqc-practice/wasm/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
