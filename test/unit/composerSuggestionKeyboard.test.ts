import { describe, expect, it } from "vitest";
import {
  resolveComposerSuggestionKeyAction,
  resolveComposerSuggestionOpen,
} from "../../src/webview/composerSuggestionKeyboard.js";

describe("composerSuggestionKeyboard re-export", () => {
  it("resolves open and keys", () => {
    expect(
      resolveComposerSuggestionOpen({
        trigger: { prefix: "/", query: "x" },
        forceClosed: false,
        prefix: "/",
      }).open,
    ).toBe(true);
    expect(
      resolveComposerSuggestionKeyAction("Escape", {
        matchCount: 1,
        activeIndex: 0,
      }).type,
    ).toBe("close");
  });
});
