import { describe, expect, it } from "vitest";
import {
  formatTranscriptForCopy,
  roleLabelForCopy,
} from "../../src/webview/transcriptCopyChrome.js";

describe("formatTranscriptForCopy", () => {
  it("labels roles and joins blocks", () => {
    expect(roleLabelForCopy("user")).toBe("You");
    expect(
      formatTranscriptForCopy([
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "tool", content: "  " },
      ]),
    ).toBe("You:\nhi\n\nALTAI:\nhello");
  });
});
