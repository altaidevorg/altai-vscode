/**
 * Pure mapping from host SessionInfo into shared SessionHistoryItem shapes.
 */

import type { SessionInfo } from "@altai/host-contract";
import type { SessionHistoryItem } from "@altai/agent-ui";

/**
 * Convert a host session into the history-item shape used by
 * `groupSessionsByRecency` and `SessionRow`. Drops empty ids.
 */
export function sessionInfoToHistoryItem(
  session: SessionInfo,
): SessionHistoryItem | null {
  const id = session.id.trim();
  if (!id) {
    return null;
  }
  const updatedAt = Date.parse(session.updatedAt);
  return {
    id,
    title: session.title.trim() || "New chat",
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
  };
}

/**
 * Map and sort-stable list for history grouping. Archived sessions are omitted.
 */
export function sessionsToHistoryItems(
  sessions: readonly SessionInfo[],
): SessionHistoryItem[] {
  const items: SessionHistoryItem[] = [];
  for (const session of sessions) {
    if (session.archived) {
      continue;
    }
    const item = sessionInfoToHistoryItem(session);
    if (item) {
      items.push(item);
    }
  }
  return items;
}
