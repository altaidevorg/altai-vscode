import { describe, expect, it } from "vitest";
import type { ChatDisplayMessage } from "../../src/webview/chatDisplayMessage.js";
import {
  activityFromMessages,
  approvalsToInspectorItems,
  buildRunInspectorSections,
  changesFromMessages,
  hasRunInspectorContent,
  latestTodosFromMessages,
} from "../../src/webview/runInspectorChrome.js";

const baseMsg = (
  partial: Partial<ChatDisplayMessage> & Pick<ChatDisplayMessage, "id" | "role">,
): ChatDisplayMessage => ({
  content: "",
  ...partial,
});

describe("approvalsToInspectorItems", () => {
  it("maps pending tool approvals", () => {
    expect(
      approvalsToInspectorItems([
        {
          kind: "tool",
          chatId: "c",
          runId: "r",
          approvalId: "a1",
          toolName: "shell",
          input: { cmd: "ls" },
        },
      ]),
    ).toEqual([
      { id: "a1", action: "shell", payload: { cmd: "ls" } },
    ]);
  });
});

describe("latestTodosFromMessages", () => {
  it("uses the last tool row with todos", () => {
    const messages = [
      baseMsg({
        id: "1",
        role: "tool",
        todos: [{ title: "old", status: "completed" }],
      }),
      baseMsg({
        id: "2",
        role: "tool",
        todos: [
          { title: "a", status: "completed" },
          { title: "b", status: "pending" },
        ],
      }),
    ];
    const model = latestTodosFromMessages(messages);
    expect(model?.total).toBe(2);
    expect(model?.done).toBe(1);
    expect(model?.todos.map((t) => t.title)).toEqual(["a", "b"]);
  });
});

describe("changesFromMessages", () => {
  it("maps edit_diff tool rows", () => {
    const items = changesFromMessages([
      baseMsg({
        id: "d1",
        role: "tool",
        filePath: "src/a.ts",
        diffOriginalText: "a\n",
        diffModifiedText: "b\n",
      }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.path).toBe("src/a.ts");
    expect(items[0]?.isNewFile).toBe(false);
  });
});

describe("activityFromMessages", () => {
  it("emits only tool rows", () => {
    const events = activityFromMessages([
      baseMsg({ id: "u", role: "user", content: "hi" }),
      baseMsg({ id: "t", role: "tool", toolName: "read", content: "ok" }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]?.label).toBe("read");
  });
});

describe("buildRunInspectorSections / hasRunInspectorContent", () => {
  it("detects empty vs populated", () => {
    const empty = buildRunInspectorSections({ approvals: [], messages: [] });
    expect(hasRunInspectorContent(empty)).toBe(false);
    const full = buildRunInspectorSections({
      approvals: [
        {
          kind: "tool",
          chatId: "c",
          runId: "r",
          approvalId: "a",
          toolName: "x",
        },
      ],
      messages: [],
    });
    expect(hasRunInspectorContent(full)).toBe(true);
  });
});
