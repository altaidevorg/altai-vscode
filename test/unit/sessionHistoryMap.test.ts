import { describe, expect, it } from "vitest";
import {
  sessionInfoToHistoryItem,
  sessionsToHistoryItems,
} from "../../src/webview/sessionHistoryMap.js";

describe("sessionInfoToHistoryItem", () => {
  it("maps host sessions into history items", () => {
    expect(
      sessionInfoToHistoryItem({
        id: "chat-1",
        title: "  Nightly  ",
        updatedAt: "2026-08-06T12:00:00.000Z",
      }),
    ).toEqual({
      id: "chat-1",
      title: "Nightly",
      updatedAt: Date.parse("2026-08-06T12:00:00.000Z"),
    });
  });

  it("rejects empty ids", () => {
    expect(
      sessionInfoToHistoryItem({
        id: "  ",
        title: "x",
        updatedAt: "2026-08-06T12:00:00.000Z",
      }),
    ).toBeNull();
  });
});

describe("sessionsToHistoryItems", () => {
  it("omits archived sessions", () => {
    const items = sessionsToHistoryItems([
      {
        id: "a",
        title: "A",
        updatedAt: "2026-08-06T12:00:00.000Z",
      },
      {
        id: "b",
        title: "B",
        updatedAt: "2026-08-06T12:00:00.000Z",
        archived: true,
      },
    ]);
    expect(items.map((item) => item.id)).toEqual(["a"]);
  });
});
