import { describe, expect, it } from "vitest";
import { canCopyDisplayMessage } from "../../src/webview/messageCopyChrome.js";

describe("canCopyDisplayMessage", () => {
  it("allows finished user and assistant text", () => {
    expect(
      canCopyDisplayMessage({ role: "user", content: "hi" }),
    ).toBe(true);
    expect(
      canCopyDisplayMessage({ role: "assistant", content: "ok" }),
    ).toBe(true);
  });

  it("blocks streaming, empty, and tools", () => {
    expect(
      canCopyDisplayMessage({
        role: "assistant",
        content: "…",
        streaming: true,
      }),
    ).toBe(false);
    expect(canCopyDisplayMessage({ role: "user", content: "  " })).toBe(false);
    expect(
      canCopyDisplayMessage({ role: "tool", content: "read" }),
    ).toBe(false);
  });
});
