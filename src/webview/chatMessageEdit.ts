/**
 * Pure helpers for edit-and-resend of user turns in the chat transcript.
 *
 * Editing user turn N discards that turn and everything after it
 * (keep_user_messages = N - 1), then starts a fresh run with the edited text.
 */

import {
  renumberUserTurnIds,
  type ChatDisplayMessage,
} from "./chatDisplayMessage.js";

/** Parse `user:N` turn ids (N is 0-based keep count or 1-based message turn). */
export function parseUserTurnId(messageId: string): number | null {
  const match = /^user:(\d+)$/.exec(messageId.trim());
  if (!match) {
    return null;
  }
  const n = Number(match[1]);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/**
 * Message id to pass to `sessions.truncate` before resending an edited turn.
 * Editing turn 1 → `user:0` (wipe). Editing turn 2 → `user:1` (keep first only).
 */
export function truncateBoundaryForEdit(userTurn: number): string | null {
  if (!Number.isSafeInteger(userTurn) || userTurn < 1) {
    return null;
  }
  return `user:${userTurn - 1}`;
}

/** Re-export renumber helper for edit flows. */
export const withStableUserTurnIds = renumberUserTurnIds;

/** Drop a user turn and all following messages in the local display list. */
export function truncateDisplayAfterUserTurn(
  messages: readonly ChatDisplayMessage[],
  userTurn: number,
): ChatDisplayMessage[] {
  if (userTurn < 1) {
    return [];
  }
  let seen = 0;
  const next: ChatDisplayMessage[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      seen += 1;
      if (seen >= userTurn) {
        break;
      }
    }
    next.push(message);
  }
  return next;
}

export function canEditUserMessage(input: {
  role: string;
  canTruncate: boolean;
  canStartRun: boolean;
  runActive: boolean;
}): boolean {
  return (
    input.role === "user" &&
    input.canTruncate &&
    input.canStartRun &&
    !input.runActive
  );
}
