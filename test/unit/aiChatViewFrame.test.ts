import { describe, expect, it } from "vitest";
import {
  AiChatViewFrame,
  buildAiChatViewRowMeta,
} from "../../src/webview/aiChatViewFrame.js";

describe("aiChatViewFrame re-export", () => {
  it("exports frame and row meta helper", () => {
    expect(typeof AiChatViewFrame).toBe("function");
    expect(
      buildAiChatViewRowMeta({
        messages: [{ id: "a", role: "assistant" }],
        status: "streaming",
        retryableFailure: false,
      })[0]?.streaming,
    ).toBe(true);
  });
});
