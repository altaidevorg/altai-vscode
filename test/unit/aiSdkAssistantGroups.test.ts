import { describe, expect, it } from "vitest";
import {
  AiSdkAssistantGroups,
  shouldShowAssistantRunActions,
} from "../../src/webview/aiSdkAssistantGroups.js";

describe("aiSdkAssistantGroups re-export", () => {
  it("exports run-action helper and component", () => {
    expect(typeof AiSdkAssistantGroups).toBe("function");
    expect(shouldShowAssistantRunActions({ streaming: true })).toBe(true);
  });
});
