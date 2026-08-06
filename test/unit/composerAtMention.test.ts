import { describe, expect, it } from "vitest";
import {
  detectAtMention,
  nextAtMentionIndex,
  removeAtMentionToken,
  shouldSearchAtMention,
} from "../../src/webview/composerAtMention.js";

describe("detectAtMention", () => {
  it("finds @query under the caret", () => {
    const text = "look at @src/foo";
    const cursor = text.length;
    expect(detectAtMention(text, cursor)).toEqual({
      start: 8,
      end: cursor,
      query: "src/foo",
    });
  });

  it("requires @ after boundary", () => {
    expect(detectAtMention("email@host", 10)).toBeNull();
    expect(detectAtMention("hi @x", 5)).toEqual({
      start: 3,
      end: 5,
      query: "x",
    });
  });

  it("returns null outside a mention", () => {
    expect(detectAtMention("hello world", 5)).toBeNull();
  });
});

describe("removeAtMentionToken", () => {
  it("strips the open token", () => {
    expect(
      removeAtMentionToken("see @pack then", {
        start: 4,
        end: 9,
        query: "pack",
      }),
    ).toBe("see then");
  });
});

describe("shouldSearchAtMention", () => {
  it("requires non-empty query", () => {
    expect(shouldSearchAtMention("")).toBe(false);
    expect(shouldSearchAtMention("a")).toBe(true);
  });
});

describe("nextAtMentionIndex", () => {
  it("navigates and picks", () => {
    expect(nextAtMentionIndex("ArrowDown", 0, 3).activeIndex).toBe(1);
    expect(nextAtMentionIndex("ArrowUp", 0, 3).activeIndex).toBe(0);
    expect(nextAtMentionIndex("Enter", 2, 3).pick).toBe(true);
    expect(nextAtMentionIndex("Escape", 1, 3).dismiss).toBe(true);
  });
});
