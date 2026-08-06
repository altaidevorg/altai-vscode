import { describe, expect, it } from "vitest";
import type { ChatDisplayMessage } from "../../src/webview/chatDisplayMessage.js";
import {
  countPendingEditDiffs,
  lastEditDiffMessage,
  runBlockedMessageFromEvent,
  shouldShowChangeReviewBanner,
} from "../../src/webview/chatRunChrome.js";

const base = (partial: Partial<ChatDisplayMessage>): ChatDisplayMessage => ({
  id: partial.id ?? "m",
  role: partial.role ?? "assistant",
  content: partial.content ?? "",
  ...partial,
});

describe("countPendingEditDiffs", () => {
  it("counts tool rows with before/after text", () => {
    const messages = [
      base({ id: "a", role: "assistant", content: "ok" }),
      base({
        id: "d1",
        role: "tool",
        content: "Edit",
        diffOriginalText: "a",
        diffModifiedText: "b",
      }),
      base({
        id: "d2",
        role: "tool",
        content: "Edit",
        diffOriginalText: "c",
        diffModifiedText: "d",
      }),
    ];
    expect(countPendingEditDiffs(messages)).toBe(2);
    expect(lastEditDiffMessage(messages)?.id).toBe("d2");
    expect(shouldShowChangeReviewBanner(2)).toBe(true);
    expect(shouldShowChangeReviewBanner(0)).toBe(false);
  });
});

describe("runBlockedMessageFromEvent", () => {
  it("returns null on clean success", () => {
    expect(
      runBlockedMessageFromEvent({
        type: "run_terminated",
        outcome: "success",
      }),
    ).toBeNull();
  });

  it("surfaces failures and cancellations", () => {
    expect(
      runBlockedMessageFromEvent({
        type: "run_terminated",
        outcome: "failed",
        error: "model timeout",
      }),
    ).toBe("model timeout");
    expect(
      runBlockedMessageFromEvent({ type: "run_cancelled" }),
    ).toBe("Run cancelled");
  });
});
