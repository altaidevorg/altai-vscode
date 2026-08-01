import * as esbuild from "esbuild";
import { mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");

await mkdir("dist/extension", { recursive: true });

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/extension/extension.ts"],
  bundle: true,
  outfile: "dist/extension/extension.js",
  platform: "node",
  format: "cjs",
  target: "node18",
  sourcemap: true,
  external: ["vscode"],
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("[build:extension] watching");
} else {
  await esbuild.build(options);
}
