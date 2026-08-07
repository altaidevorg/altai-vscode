import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAT_STARTERS,
  shouldShowChatStarters,
} from "../../src/webview/chatEmptyStarterTemplates.js";

describe("shouldShowChatStarters", () => {
  it("requires empty home and start-run capability", () => {
    expect(
      shouldShowChatStarters({ emptyHome: true, canStartRun: true }),
    ).toBe(true);
    expect(
      shouldShowChatStarters({ emptyHome: false, canStartRun: true }),
    ).toBe(false);
    expect(
      shouldShowChatStarters({ emptyHome: true, canStartRun: false }),
    ).toBe(false);
  });
});

describe("DEFAULT_CHAT_STARTERS", () => {
  it("provides labeled prompts including snippet shortcuts", () => {
    expect(DEFAULT_CHAT_STARTERS.length).toBeGreaterThanOrEqual(6);
    for (const starter of DEFAULT_CHAT_STARTERS) {
      expect(starter.label.trim()).not.toBe("");
      const value = starter.value.trim();
      if (value.startsWith("/")) {
        expect(value.length).toBeGreaterThan(1);
      } else {
        expect(value.length).toBeGreaterThan(20);
      }
    }
    expect(
      DEFAULT_CHAT_STARTERS.some((s) => s.value.includes("#pr")),
    ).toBe(true);
    expect(
      DEFAULT_CHAT_STARTERS.some((s) => s.value.includes("#testplan")),
    ).toBe(true);
    expect(DEFAULT_CHAT_STARTERS.some((s) => s.value.trim() === "/help")).toBe(
      true,
    );
    expect(
      DEFAULT_CHAT_STARTERS.some((s) => s.value.trim() === "/settings"),
    ).toBe(true);
    expect(
      DEFAULT_CHAT_STARTERS.some((s) => s.value.trim() === "/attach-diff"),
    ).toBe(true);
    expect(
      DEFAULT_CHAT_STARTERS.some((s) => s.value.trim() === "/tasks"),
    ).toBe(true);
    expect(
      DEFAULT_CHAT_STARTERS.some((s) => s.value.trim() === "/walkthrough"),
    ).toBe(true);
  });
});
