import { describe, expect, it } from "vitest";
import {
  chatDisplayBubbleClassName,
  chatDisplayRoleLabel,
} from "../../src/webview/chatDisplayChrome.js";

describe("chatDisplayChrome re-export", () => {
  it("labels user/assistant bubbles", () => {
    expect(chatDisplayRoleLabel("user")).toBe("You");
    expect(chatDisplayRoleLabel("assistant")).toBe("ALTAI");
    expect(chatDisplayBubbleClassName("tool")).toContain("tool");
  });
});
