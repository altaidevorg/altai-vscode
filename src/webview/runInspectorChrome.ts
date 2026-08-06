/**
 * Pure helpers mapping Chat webview state into run-inspector section props.
 * Host-local DTO shapes (no `@altai/*` imports — keeps extension tsc clean).
 */

import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import type { PendingToolApproval } from "./interactivePrompt.js";
import { summarizeTodoItems } from "./todoToolParse.js";

export type ApprovalsInspectorItem = {
  id: string;
  action: string;
  payload: unknown;
};

export type TodosInspectorItem = {
  id: string;
  title: string;
  status: string;
};

export type ChangesInspectorItem = {
  id: string;
  path: string;
  originalContent: string;
  proposedContent: string;
  isNewFile: boolean;
};

export type ActivityInspectorEvent = {
  id: string;
  label: string;
  detail?: string;
  tone?: "default" | "success" | "warning" | "error";
  createdAt: number;
};

export type InspectorTodosModel = {
  done: number;
  total: number;
  todos: TodosInspectorItem[];
};

export type RunInspectorSectionsModel = {
  approvals: ApprovalsInspectorItem[];
  todos: InspectorTodosModel | null;
  changes: ChangesInspectorItem[];
  activity: ActivityInspectorEvent[];
};

/** Map pending tool approvals to ApprovalsInspector items. */
export function approvalsToInspectorItems(
  approvals: readonly PendingToolApproval[],
): ApprovalsInspectorItem[] {
  return approvals.map((row) => ({
    id: row.approvalId,
    action: row.toolName || "tool",
    payload: row.input ?? {},
  }));
}

/**
 * Take latest tool message that embeds a todo list, if any.
 */
export function latestTodosFromMessages(
  messages: readonly ChatDisplayMessage[],
): InspectorTodosModel | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== "tool" || !message.todos?.length) {
      continue;
    }
    const summary = summarizeTodoItems(message.todos);
    const todos: TodosInspectorItem[] = message.todos.map((todo, index) => ({
      id: todo.id?.trim() || `todo-${index}`,
      title: todo.title,
      status: todo.status,
    }));
    return {
      done: summary.done,
      total: summary.total,
      todos,
    };
  }
  return null;
}

/** Map edit_diff tool rows to ChangesInspector queue entries. */
export function changesFromMessages(
  messages: readonly ChatDisplayMessage[],
): ChangesInspectorItem[] {
  const items: ChangesInspectorItem[] = [];
  for (const message of messages) {
    if (
      message.role !== "tool" ||
      message.diffOriginalText === undefined ||
      message.diffModifiedText === undefined
    ) {
      continue;
    }
    const path =
      message.filePath?.trim() ||
      message.content.trim() ||
      message.toolName ||
      "change";
    items.push({
      id: message.id,
      path,
      originalContent: message.diffOriginalText,
      proposedContent: message.diffModifiedText,
      isNewFile: !message.diffOriginalText.trim(),
    });
  }
  return items;
}

/** Compact tool activity timeline (newest last, capped). */
export function activityFromMessages(
  messages: readonly ChatDisplayMessage[],
  limit = 24,
): ActivityInspectorEvent[] {
  const events: ActivityInspectorEvent[] = [];
  for (const message of messages) {
    if (message.role !== "tool") {
      continue;
    }
    const label = message.toolName?.trim() || "tool";
    const detail = message.filePath?.trim() || message.content.slice(0, 120);
    events.push({
      id: message.id,
      label,
      ...(detail ? { detail } : {}),
      tone: "default",
      createdAt: 0,
    });
  }
  if (events.length <= limit) {
    return events;
  }
  return events.slice(-limit);
}

export function buildRunInspectorSections(input: {
  approvals: readonly PendingToolApproval[];
  messages: readonly ChatDisplayMessage[];
}): RunInspectorSectionsModel {
  return {
    approvals: approvalsToInspectorItems(input.approvals),
    todos: latestTodosFromMessages(input.messages),
    changes: changesFromMessages(input.messages),
    activity: activityFromMessages(input.messages),
  };
}

export function hasRunInspectorContent(
  model: RunInspectorSectionsModel,
): boolean {
  return (
    model.approvals.length > 0 ||
    Boolean(model.todos && model.todos.total > 0) ||
    model.changes.length > 0 ||
    model.activity.length > 0
  );
}
