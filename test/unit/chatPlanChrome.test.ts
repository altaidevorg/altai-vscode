import { describe, expect, it } from "vitest";
import type { ChatDisplayMessage } from "../../src/webview/chatDisplayMessage.js";
import {
  isPlanPermissionMode,
  latestTodosFromMessages,
  permissionModeAfterExitPlan,
} from "../../src/webview/chatPlanChrome.js";

describe("isPlanPermissionMode", () => {
  it("detects plan vs other modes", () => {
    expect(isPlanPermissionMode("plan")).toBe(true);
    expect(isPlanPermissionMode("auto-edit")).toBe(false);
    expect(isPlanPermissionMode(null)).toBe(false);
  });
});

describe("latestTodosFromMessages", () => {
  it("returns the newest non-empty todos list", () => {
    const messages: ChatDisplayMessage[] = [
      {
        id: "t1",
        role: "tool",
        content: "Todos",
        todos: [{ title: "old", status: "completed" }],
      },
      { id: "a", role: "assistant", content: "ok" },
      {
        id: "t2",
        role: "tool",
        content: "Todos",
        todos: [
          { title: "new a", status: "completed" },
          { title: "new b", status: "pending" },
        ],
      },
    ];
    expect(latestTodosFromMessages(messages)).toEqual([
      { title: "new a", status: "completed" },
      { title: "new b", status: "pending" },
    ]);
  });
});

describe("permissionModeAfterExitPlan", () => {
  it("exits into auto-edit", () => {
    expect(permissionModeAfterExitPlan()).toBe("auto-edit");
  });
});
