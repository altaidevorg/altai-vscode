import { describe, expect, it } from "vitest";
import { displayToolGroupIconKey } from "../../src/webview/displayToolGroupIcon.js";

describe("displayToolGroupIconKey re-export", () => {
  it("maps kinds", () => {
    expect(displayToolGroupIconKey("cmd")).toBe("terminal");
  });
});
