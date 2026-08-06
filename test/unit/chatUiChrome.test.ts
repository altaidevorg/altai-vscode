import { describe, expect, it } from "vitest";
import {
  chatLineKind,
  shouldShowChatEmptyHome,
} from "../../src/webview/chatLineKind.js";
import { filterSessionsBySearch } from "../../src/webview/sessionSearch.js";
import type { SessionHistoryItem } from "@altai/agent-ui";

describe("chatLineKind", () => {
  it("classifies user and agent lines", () => {
    expect(chatLineKind("You: fix the tests")).toBe("user");
    expect(chatLineKind("I'll update package.json")).toBe("agent");
    expect(chatLineKind("Run cancelled")).toBe("meta");
    expect(chatLineKind("ALTAI: which option?")).toBe("meta");
  });

  it("shows empty home only with no lines", () => {
    expect(shouldShowChatEmptyHome([])).toBe(true);
    expect(shouldShowChatEmptyHome(["You: hi"])).toBe(false);
  });
});

describe("filterSessionsBySearch", () => {
  const items: SessionHistoryItem[] = [
    {
      id: "1",
      title: "Fix tests",
      snippet: "vitest failing",
      updatedAt: 1,
    },
    {
      id: "2",
      title: "Docs pass",
      snippet: "README polish",
      updatedAt: 2,
    },
  ];

  it("filters by title or snippet", () => {
    expect(
      filterSessionsBySearch(items, "vitest").map((s: SessionHistoryItem) => s.id),
    ).toEqual(["1"]);
    expect(
      filterSessionsBySearch(items, "docs").map((s: SessionHistoryItem) => s.id),
    ).toEqual(["2"]);
    expect(
      filterSessionsBySearch(items, "").map((s: SessionHistoryItem) => s.id),
    ).toEqual(["1", "2"]);
  });
});
