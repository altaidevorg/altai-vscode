import { describe, expect, it } from "vitest";
import { withAssetCacheBust } from "./assetCacheBust.js";

describe("withAssetCacheBust", () => {
  it("appends query and reuses existing", () => {
    expect(withAssetCacheBust("vscode-resource:/x/main.js", 42)).toBe(
      "vscode-resource:/x/main.js?v=42",
    );
    expect(withAssetCacheBust("https://ex/a?b=1", "9.1")).toBe(
      "https://ex/a?b=1&v=9.1",
    );
  });
});
