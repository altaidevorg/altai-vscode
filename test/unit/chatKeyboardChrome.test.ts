import { describe, expect, it } from "vitest";
import {
  isEscapeDismissKey,
  isTextEditingKeyboardTarget,
  shouldDismissSidePanelOnEscape,
} from "../../src/webview/chatKeyboardChrome.js";

describe("chatKeyboardChrome re-exports", () => {
  it("exposes Escape dismiss helpers from @altai/agent-ui", () => {
    expect(isEscapeDismissKey({ key: "Escape" })).toBe(true);
    expect(isEscapeDismissKey({ key: "Escape", ctrlKey: true })).toBe(false);
    expect(isTextEditingKeyboardTarget({ tagName: "INPUT" })).toBe(true);
    expect(
      shouldDismissSidePanelOnEscape({
        key: "Escape",
        isEditableTarget: true,
      }),
    ).toBe(false);
  });
});
