import { describe, expect, it } from "vitest";
import {
  resolveAssistantRunActionMode,
  shouldShowAssistantRunActions,
} from "../../src/webview/chatSdkAssistantChrome.js";

describe("chatSdkAssistantChrome re-export", () => {
  it("resolves action mode", () => {
    expect(resolveAssistantRunActionMode({ streaming: true })).toBe("stop");
    expect(shouldShowAssistantRunActions({ streaming: false })).toBe(false);
  });
});
