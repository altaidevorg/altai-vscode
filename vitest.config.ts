import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts", "test/integration/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // Webview sources import with .js extensions (Node16 / bundler style).
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
  },
});
