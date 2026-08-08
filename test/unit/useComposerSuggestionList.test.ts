import { describe, expect, it } from "vitest";
import { useComposerSuggestionList } from "../../src/webview/useComposerSuggestionList.js";

describe("useComposerSuggestionList re-export", () => {
  it("exports a hook", () => {
    expect(typeof useComposerSuggestionList).toBe("function");
  });
});
