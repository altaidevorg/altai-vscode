import { describe, expect, it } from "vitest";
import {
  isTodoToolName,
  parseTodoItemsFromInput,
  summarizeTodoItems,
} from "../../src/webview/todoToolParse.js";

describe("todoToolParse", () => {
  it("recognizes todo tool names", () => {
    expect(isTodoToolName("todo_write")).toBe(true);
    expect(isTodoToolName("edit")).toBe(false);
  });

  it("parses free-form item fields", () => {
    const items = parseTodoItemsFromInput({
      items: [
        { content: "A", status: "done" },
        { title: "B", status: "in_progress" },
      ],
    });
    expect(items).toEqual([
      { id: "item-0", title: "A", status: "completed" },
      { id: "item-1", title: "B", status: "in_progress" },
    ]);
    expect(summarizeTodoItems(items)).toMatchObject({
      total: 2,
      done: 1,
      inProgress: 1,
    });
  });
});
