import { describe, expect, it } from "vitest";
import {
  COMPOSER_PLACEHOLDERS,
  pickPlaceholder,
} from "../../src/webview/composerPlaceholders.js";

describe("composerPlaceholders re-export (A6.146)", () => {
  it("picks from catalog", () => {
    expect(pickPlaceholder(() => 0)).toBe(COMPOSER_PLACEHOLDERS[0]);
  });
});
