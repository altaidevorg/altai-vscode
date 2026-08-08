import { describe, expect, it } from "vitest";
import {
  canCopyDisplayMessage,
  lastAssistantMessageId,
  resolveDisplayMessageActions,
} from "../../src/webview/messageCopyChrome.js";

describe("canCopyDisplayMessage re-export", () => {
  it("allows finished user and assistant text", () => {
    expect(canCopyDisplayMessage({ role: "user", content: "hi" })).toBe(true);
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
    expect(canCopyDisplayMessage({ role: "tool", content: "read" })).toBe(
      false,
    );
  });

  it("resolves shared action flags", () => {
    expect(
      lastAssistantMessageId([
        { id: "a1", role: "assistant" },
        { id: "u", role: "user" },
      ]),
    ).toBe("a1");
    const flags = resolveDisplayMessageActions({
      message: { id: "u1", role: "user", content: "x" },
      lastAssistantId: null,
      canEditUserMessages: true,
      canRetry: false,
      canOpenFile: false,
      canOpenDiff: false,
      hasEditHandler: true,
      hasRetryHandler: false,
    });
    expect(flags.showEdit).toBe(true);
    expect(flags.showCopy).toBe(true);
  });
});
