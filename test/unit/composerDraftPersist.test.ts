import { describe, expect, it } from "vitest";
import {
  COMPOSER_DRAFT_DEBOUNCE_MS,
  shouldPersistComposerDraftImmediately,
} from "../../src/shared/composerDraftPersist.js";

describe("composer draft persist policy", () => {
  it("uses a short debounce for non-empty drafts", () => {
    expect(COMPOSER_DRAFT_DEBOUNCE_MS).toBeGreaterThanOrEqual(100);
    expect(COMPOSER_DRAFT_DEBOUNCE_MS).toBeLessThanOrEqual(500);
    expect(shouldPersistComposerDraftImmediately("hello")).toBe(false);
  });

  it("flushes empty drafts immediately so reload stays clean", () => {
    expect(shouldPersistComposerDraftImmediately("")).toBe(true);
  });
});
