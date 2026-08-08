/**
 * Pure helpers for Extension Host → Webview "Ask about selection" deep-links.
 * No React / vscode APIs.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.121). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export type OpenChatWithSelectionPayload = {
  /** Unique key so remounted/idempotent opens re-apply. */
  key: number;
  uri: string;
  path: string;
  text: string;
  /** Line count for chips / display; recomputed if missing in older payloads. */
  lines: number;
};

function countLines(text: string): number {
  if (!text) {
    return 0;
  }
  const trimmed = text.replace(/\n+$/, "");
  if (!trimmed) {
    return 0;
  }
  return trimmed.split("\n").length;
}

/**
 * Runtime-validate a `chat.attachSelection` event payload.
 * Returns null when the payload is malformed or empty.
 */
export function parseOpenChatWithSelectionPayload(
  value: unknown,
): OpenChatWithSelectionPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.key !== "number" || !Number.isFinite(record.key)) {
    return null;
  }
  if (typeof record.uri !== "string" || record.uri.trim().length === 0) {
    return null;
  }
  if (typeof record.path !== "string" || record.path.trim().length === 0) {
    return null;
  }
  if (typeof record.text !== "string" || record.text.trim().length === 0) {
    return null;
  }
  const lines =
    typeof record.lines === "number" &&
    Number.isFinite(record.lines) &&
    record.lines > 0
      ? Math.floor(record.lines)
      : countLines(record.text);
  return {
    key: record.key,
    uri: record.uri.trim(),
    path: record.path.trim(),
    text: record.text,
    lines,
  };
}

export function buildOpenChatWithSelectionPayload(input: {
  uri: string;
  path: string;
  text: string;
  lines?: number;
  key?: number;
}): OpenChatWithSelectionPayload | null {
  const uri = input.uri.trim();
  const path = input.path.trim();
  const text = input.text;
  if (!uri || !path || !text.trim()) {
    return null;
  }
  const lines =
    typeof input.lines === "number" &&
    Number.isFinite(input.lines) &&
    input.lines > 0
      ? Math.floor(input.lines)
      : countLines(text);
  return {
    key: input.key ?? Date.now(),
    uri,
    path,
    text,
    lines,
  };
}
