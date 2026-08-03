import * as esbuild from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
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
        path: require.resolve(id),
      }));
    }
  },
};

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
  absWorkingDir: extensionRoot,
  nodePaths: [path.join(extensionRoot, "node_modules")],
  loader: {
    ".css": "css",
  },
  // Ensure no vscode sneaks into the webview graph via accidental imports.
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
