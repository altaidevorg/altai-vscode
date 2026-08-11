/** Shell-owned canonical Work Inbox polling when Operations is unmounted. */

import type { AgentEventType, WorkInboxItem } from "@altai/host-contract";

export type AttentionPollSource = {
  listWorkInbox(): Promise<WorkInboxItem[]>;
};

export async function fetchOperationsAttentionCount(
  available: boolean,
  source: AttentionPollSource,
): Promise<number> {
  if (!available) return 0;
  return (await source.listWorkInbox()).length;
}

export function shouldRefreshAttentionOnEvent(type: AgentEventType): boolean {
  return type === "lifecycle" || type === "notification";
}
