import { describe, expect, it } from "vitest";
import {
  formatComposerHintLine,
  listComposerAffordances,
} from "../../src/webview/composerHintChrome.js";

describe("composer affordance hints", () => {
  it("lists slash, hash, and at", () => {
    expect(listComposerAffordances().map((h) => h.glyph)).toEqual([
      "/",
      "#",
      "@",
    ]);
    expect(formatComposerHintLine()).toMatch(/\/ commands/);
    expect(formatComposerHintLine()).toMatch(/# snippets/);
  });
});
