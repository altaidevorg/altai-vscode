import { describe, expect, it } from "vitest";
import { useComposerController } from "../../src/webview/useComposerController.js";

describe("useComposerController re-export", () => {
  it("exports a function", () => {
    expect(typeof useComposerController).toBe("function");
  });
});
