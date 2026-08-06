/**
 * Pure todo_write parsing for Chat tool bubbles.
 * Mirrors `@altai/agent-ui` parseTodoItems / summarizeTodos without pulling
 * React into extension/unit import graphs.
 */

export type TodoStatus = "pending" | "in_progress" | "completed";

export type TodoParseItem = {
  id?: string;
  title: string;
  description?: string;
  status: TodoStatus;
};

export function isTodoToolName(name: string): boolean {
  const n = name.toLowerCase().replace(/[\s-]+/g, "_");
  return (
    n === "todo_write" ||
    n === "todowrite" ||
    n === "update_todos" ||
    n === "todo" ||
    n === "todos"
  );
}

export function parseTodoItemsFromInput(input: unknown): TodoParseItem[] {
  if (!input || typeof input !== "object") {
    return [];
  }
  const items = (input as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((raw, i) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const title =
      (typeof it.content === "string" && it.content) ||
      (typeof it.title === "string" && it.title) ||
      (typeof it.task === "string" && it.task) ||
      (typeof it.text === "string" && it.text) ||
      "Untitled task";
    const id = typeof it.id === "string" ? it.id : `item-${i}`;
    const description =
      typeof it.description === "string" ? it.description : undefined;
    return {
      id,
      title,
      ...(description ? { description } : {}),
      status: normalizeStatus(it.status),
    };
  });
}

function normalizeStatus(value: unknown): TodoStatus {
  const v =
    typeof value === "string"
      ? value.trim().toLowerCase().replace(/[\s-]+/g, "_")
      : "";
  if (["completed", "complete", "done", "finished"].includes(v)) {
    return "completed";
  }
  if (
    ["in_progress", "active", "running", "doing", "started", "wip"].includes(v)
  ) {
    return "in_progress";
  }
  return "pending";
}

export function summarizeTodoItems(items: readonly TodoParseItem[]): {
  total: number;
  done: number;
  inProgress: number;
  pct: number;
} {
  const total = items.length;
  const done = items.filter((i) => i.status === "completed").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, inProgress, pct };
}
