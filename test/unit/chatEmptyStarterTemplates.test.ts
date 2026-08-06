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
  it("provides labeled prompts", () => {
    expect(DEFAULT_CHAT_STARTERS.length).toBeGreaterThanOrEqual(4);
    for (const starter of DEFAULT_CHAT_STARTERS) {
      expect(starter.label.trim()).not.toBe("");
      expect(starter.value.trim().length).toBeGreaterThan(20);
    }
  });
});
