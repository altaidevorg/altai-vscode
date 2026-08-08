import { describe, expect, it } from "vitest";
import {
  canRetryLastAssistantTurn,
  resolveChatAriaLive,
  resolveTranscriptRunErrorVariant,
} from "../../src/webview/chatTranscriptChrome.js";

describe("chatTranscriptChrome re-export", () => {
  it("exposes pure policy helpers", () => {
    expect(resolveChatAriaLive("assertive")).toBe("assertive");
    expect(
      canRetryLastAssistantTurn({
        retryableFailure: true,
        role: "assistant",
        index: 0,
        messageCount: 1,
        status: "ready",
      }),
    ).toBe(true);
    expect(resolveTranscriptRunErrorVariant("Run paused — x")).toBe(
      "attention",
    );
  });
});
