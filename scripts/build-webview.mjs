import * as esbuild from "esbuild";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const watch = process.argv.includes("--watch");
const require = createRequire(import.meta.url);
const extensionRoot = process.cwd();

await mkdir("dist/webview", { recursive: true });

/**
 * file: deps resolve into ../altai-app-main; esbuild then looks for peers next
 * to that realpath. Force shared peers to the extension node_modules.
 * @type {import("esbuild").Plugin}
 */
const peerAliasPlugin = {
  name: "peer-alias-from-extension",
  setup(build) {
    const aliases = [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "streamdown",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "clsx",
      "tailwind-merge",
      "@altai/host-contract",
    ];
    for (const id of aliases) {
      const filter = new RegExp(
        `^${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      );
      build.onResolve({ filter }, () => ({
        path:
          id === "streamdown"
            ? path.join(extensionRoot, "node_modules/streamdown/dist/index.js")
            : require.resolve(id),
      }));
    }
  },
};

const cssCli = path.join(
  extensionRoot,
  "node_modules",
  "@tailwindcss",
  "cli",
  "dist",
  "index.mjs",
);
const cssInput = path.join(extensionRoot, "src/webview/main.css");
const cssOutput = path.join(extensionRoot, "dist/webview/main.css");

function requireCssCli() {
  if (!existsSync(cssCli)) {
    throw new Error(
      "Missing @tailwindcss/cli. Run npm install so webview CSS can build.",
    );
  }
}

/** One-shot Tailwind compile into dist/webview/main.css. */
function buildWebviewCssOnce() {
  requireCssCli();
  const result = spawnSync(
    process.execPath,
    [cssCli, "-i", cssInput, "-o", cssOutput],
    {
      cwd: extensionRoot,
      stdio: "inherit",
      env: process.env,
    },
  );
  if (result.status !== 0) {
    throw new Error(`Tailwind CSS build failed (exit ${result.status ?? "?"})`);
  }
}

/** Watch Tailwind CSS (non-blocking). */
function watchWebviewCss() {
  requireCssCli();
  const child = spawn(
    process.execPath,
    [cssCli, "-i", cssInput, "-o", cssOutput, "--watch"],
    {
      cwd: extensionRoot,
      stdio: "inherit",
      env: process.env,
    },
  );
  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[build:webview] CSS watch exited (${signal})`);
    } else if (code !== 0 && code !== null) {
      console.error(`[build:webview] CSS watch failed (exit ${code})`);
    }
  });
  return child;
}

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
  absWorkingDir: extensionRoot,
  nodePaths: [path.join(extensionRoot, "node_modules")],
  plugins: [
    peerAliasPlugin,
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
  buildWebviewCssOnce();
  watchWebviewCss();
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("[build:webview] watching JS + CSS");
} else {
  await esbuild.build(options);
  buildWebviewCssOnce();
  if (!existsSync(cssOutput)) {
    await writeFile(cssOutput, "/* generated empty stylesheet */\n");
  }
}
