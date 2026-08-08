import { describe, expect, it } from "vitest";
import {
  displayCopyActionLabel,
  displayOpeningActionLabel,
} from "../../src/webview/chatDisplayActionCopy.js";

describe("chatDisplayActionCopy re-export", () => {
  it("exposes labels", () => {
    expect(displayCopyActionLabel(true)).toBe("Copied");
    expect(displayOpeningActionLabel(true, "Diff")).toBe("Opening…");
  });
});
