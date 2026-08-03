import * as esbuild from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

const watch = process.argv.includes("--watch");

await mkdir("dist/webview", { recursive: true });

/** @type {import("esbuild").Plugin} */
const cssWritePlugin = {
  name: "css-write",
  setup(build) {
    build.onEnd(async (result) => {
      const cssOutput = result.outputFiles?.find((f) => f.path.endsWith(".css"));
      if (cssOutput) {
        await writeFile("dist/webview/main.css", cssOutput.text);
      }
    });
  },
};

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/webview/main.tsx"],
  bundle: true,
  outfile: "dist/webview/main.js",
  platform: "browser",
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  sourcemap: true,
  logLevel: "info",
  write: true,
  loader: {
    ".css": "css",
  },
  // Ensure no vscode sneaks into the webview graph via accidental imports.
  plugins: [
    {
      name: "ban-vscode",
      setup(build) {
        build.onResolve({ filter: /^vscode$/ }, () => ({
          path: "vscode",
          errors: [
            {
              text: "Webview bundle must not import 'vscode'. Use the typed bridge.",
            },
          ],
        }));
      },
    },
  ],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("[build:webview] watching");
} else {
  await esbuild.build(options);
  // esbuild writes sibling main.css when CSS is imported from the entry.
  try {
    readFileSync("dist/webview/main.css");
  } catch {
    await writeFile(
      "dist/webview/main.css",
      "/* generated empty stylesheet */\n",
    );
  }
}
