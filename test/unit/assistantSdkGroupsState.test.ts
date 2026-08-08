import { describe, expect, it } from "vitest";
import { buildAssistantSdkGroupsState } from "../../src/webview/assistantSdkGroupsState.js";

describe("assistantSdkGroupsState re-export", () => {
  it("builds state", () => {
    const s = buildAssistantSdkGroupsState([{ type: "text" }, { type: "text" }]);
    expect(s.lastTextPartIdx).toBe(1);
  });
});
