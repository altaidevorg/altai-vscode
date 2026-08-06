/**
 * Filter shared session history items by a free-text search query.
 */

import type { SessionHistoryItem } from "@altai/agent-ui";

export function filterSessionsBySearch(
  items: readonly SessionHistoryItem[],
  search: string,
): SessionHistoryItem[] {
  const q = search.trim().toLowerCase();
  if (!q) {
    return [...items];
  }
  return items.filter((item) => {
    const title = (item.title ?? "").toLowerCase();
    const snippet = (item.snippet ?? "").toLowerCase();
    return title.includes(q) || snippet.includes(q);
  });
}
