/**
 * Pure chat transcript display model (host-neutral). Builds structured
 * bubbles from session history + live AgentEvent stream without Desktop
 * AiChat dependency.
 */

import type { AgentEvent } from "@altai/host-contract";
import type { ContextChip } from "@altai/agent-ui";

export type ChatDisplayRole =
  | "user"
  | "assistant"
  | "system"
  | "tool"
  | "meta";

export type ChatDisplayMessage = {
  id: string;
  role: ChatDisplayRole;
  content: string;
  /** Live stream still appending to this bubble. */
  streaming?: boolean;
  /** Optional context chips from attached editor / terminal / diff. */
  chips?: ContextChip[];
};

export type SessionMessageLike = {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

const DEFAULT_MAX = 200;

export function newDisplayMessageId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Assign sequential `user:1`… ids for protocol-compatible edit / truncate. */
export function renumberUserTurnIds(
  messages: readonly ChatDisplayMessage[],
): ChatDisplayMessage[] {
  let turn = 0;
  return messages.map((message) => {
    if (message.role !== "user") {
      return message;
    }
    turn += 1;
    return { ...message, id: `user:${turn}` };
  });
}

/**
 * Map durable session messages into display bubbles (user/assistant only).
 */
export function displayMessagesFromSession(
  messages: readonly SessionMessageLike[],
  options?: { maxMessages?: number },
): ChatDisplayMessage[] {
  const max = options?.maxMessages ?? DEFAULT_MAX;
  const mapped = messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .slice(-max)
    .map((message) => {
      const content = message.content.replace(/\s+/g, " ").trim() || "(empty)";
      return {
        id: message.id?.trim() || newDisplayMessageId(message.role),
        role: message.role,
        content,
      };
    });
  return renumberUserTurnIds(mapped);
}

/** Empty home when no conversational content is visible. */
export function shouldShowChatEmptyHome(
  messages: readonly ChatDisplayMessage[],
): boolean {
  return !messages.some(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      message.content.trim().length > 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extract assistant/user text from a mapped AgentEvent payload.
 * Handles nested crate shapes (`content`, `text`, `delta`, nested type).
 */
export function textFromAgentEvent(event: AgentEvent): {
  role: "user" | "assistant";
  text: string;
  done: boolean;
} | null {
  const body = isRecord(event.payload) ? event.payload : {};
  const nested =
    isRecord(body.event) ? body.event : isRecord(body.payload) ? body.payload : body;
  const crateType =
    typeof nested.type === "string"
      ? nested.type
      : typeof body.type === "string"
        ? body.type
        : event.type;

  if (
    crateType === "agent_message" ||
    crateType === "message" ||
    event.type === "message"
  ) {
    const text =
      (typeof nested.content === "string" && nested.content) ||
      (typeof nested.text === "string" && nested.text) ||
      (typeof nested.delta === "string" && nested.delta) ||
      (typeof body.content === "string" && body.content) ||
      (typeof body.text === "string" && body.text) ||
      "";
    if (!text) {
      return null;
    }
    const roleRaw =
      (typeof nested.role === "string" && nested.role) ||
      (typeof body.role === "string" && body.role) ||
      "assistant";
    const role = roleRaw === "user" ? "user" : "assistant";
    const done = nested.done === true || body.done === true;
    return { role, text, done };
  }

  if (crateType === "thinking" || event.type === "reasoning") {
    // Reasoning is available but we hide noisy intermediate thinking by default.
    return null;
  }

  return null;
}

function pushTrimmed(
  messages: ChatDisplayMessage[],
  next: ChatDisplayMessage,
  max: number,
): ChatDisplayMessage[] {
  return [...messages, next].slice(-max);
}

/**
 * Apply a live host event into the structured transcript.
 * Ignores events for other chats when activeChatId is set.
 */
export function applyAgentEventToMessages(
  messages: readonly ChatDisplayMessage[],
  event: AgentEvent,
  options: {
    activeChatId: string | null;
    maxMessages?: number;
  },
): ChatDisplayMessage[] {
  const active = options.activeChatId;
  if (active && event.chatId && event.chatId !== active) {
    return [...messages];
  }
  const max = options.maxMessages ?? DEFAULT_MAX;
  const list = [...messages];

  const textEvent = textFromAgentEvent(event);
  if (textEvent) {
    const last = list[list.length - 1];
    if (
      last &&
      last.role === textEvent.role &&
      last.streaming &&
      textEvent.role === "assistant"
    ) {
      // Snapshot (replacement) when the payload re-sends the full buffer;
      // otherwise append as a delta.
      const nextContent = textEvent.text.startsWith(last.content)
        ? textEvent.text
        : last.content + textEvent.text;
      const next = [...list];
      next[next.length - 1] = {
        ...last,
        content: nextContent,
        streaming: !textEvent.done,
      };
      return next.slice(-max);
    }
    return pushTrimmed(
      list,
      {
        id: `live_${event.seq}_${event.runId}`,
        role: textEvent.role,
        content: textEvent.text,
        streaming: textEvent.role === "assistant" && !textEvent.done,
      },
      max,
    );
  }

  // Lifecycle / tool meta (low noise).
  const body = isRecord(event.payload) ? event.payload : {};
  const crateType =
    (isRecord(body.event) && typeof body.event.type === "string" && body.event.type) ||
    (typeof body.type === "string" && body.type) ||
    event.type;

  if (
    crateType === "run_terminated" ||
    (event.type === "lifecycle" &&
      (crateType === "run_terminated" || body.outcome !== undefined))
  ) {
    return list.map((message) =>
      message.streaming ? { ...message, streaming: false } : message,
    );
  }

  if (crateType === "tool_call_start" || event.type === "tool") {
    const name =
      (typeof body.name === "string" && body.name) ||
      (isRecord(body.event) &&
        typeof body.event.name === "string" &&
        body.event.name) ||
      "tool";
    return pushTrimmed(
      list,
      {
        id: newDisplayMessageId("tool"),
        role: "tool",
        content: `Using ${name}…`,
      },
      max,
    );
  }

  if (event.type === "warning") {
    const warn =
      (typeof body.warning === "string" && body.warning) ||
      (typeof body.message === "string" && body.message) ||
      "Run warning";
    return pushTrimmed(
      list,
      {
        id: newDisplayMessageId("meta"),
        role: "meta",
        content: warn,
      },
      max,
    );
  }

  return list;
}

export function appendUserMessage(
  messages: readonly ChatDisplayMessage[],
  content: string,
  options?: { maxMessages?: number; chips?: ContextChip[] },
): ChatDisplayMessage[] {
  const max = options?.maxMessages ?? DEFAULT_MAX;
  const withUser = pushTrimmed(
    [...messages],
    {
      id: newDisplayMessageId("user"),
      role: "user",
      content: content.trim(),
      ...(options?.chips && options.chips.length > 0
        ? { chips: options.chips }
        : {}),
    },
    max,
  );
  return renumberUserTurnIds(withUser);
}

export function appendMetaMessage(
  messages: readonly ChatDisplayMessage[],
  content: string,
  options?: { maxMessages?: number },
): ChatDisplayMessage[] {
  const max = options?.maxMessages ?? DEFAULT_MAX;
  return pushTrimmed(
    [...messages],
    {
      id: newDisplayMessageId("meta"),
      role: "meta",
      content,
    },
    max,
  );
}
