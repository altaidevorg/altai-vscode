import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * `@altai/agent-ui` is a file: sibling with peerDependencies. Local monorepos
 * may resolve React via the app's pnpm store; clean CI checkouts do not. Force
 * peers to the extension install tree (same approach as build-webview.mjs).
 */
const peerAlias = {
  react: path.resolve(root, "node_modules/react"),
  "react/jsx-runtime": path.resolve(
    root,
    "node_modules/react/jsx-runtime.js",
  ),
  "react/jsx-dev-runtime": path.resolve(
    root,
    "node_modules/react/jsx-dev-runtime.js",
  ),
  "react-dom": path.resolve(root, "node_modules/react-dom"),
  "react-dom/client": path.resolve(
    root,
    "node_modules/react-dom/client.js",
  ),
  streamdown: path.resolve(root, "node_modules/streamdown"),
};

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts", "test/integration/**/*.test.ts"],
    environment: "node",
    server: {
      deps: {
        inline: ["@altai/agent-ui", "@altai/host-contract"],
      },
    },
  },
  resolve: {
    // Webview sources import with .js extensions (Node16 / bundler style).
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
    alias: peerAlias,
  },
});
