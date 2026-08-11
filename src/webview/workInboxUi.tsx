import type { InboxPort, WorkInboxItem } from "@altai/host-contract";
import { formatRelativeTime } from "@altai/agent-ui";
import type { WorkInboxRow } from "./workOsUi.js";

export type WorkInboxPort = Pick<InboxPort, "listWorkInbox">;

/** Keep presentation-only relative labels out of the durable wire contract. */
export function toWorkInboxRow(
  item: WorkInboxItem,
  now = Date.now(),
): WorkInboxRow {
  return {
    id: item.id,
    workId: item.workId,
    kind: item.kind,
    title: item.title,
    why: item.why,
    ageLabel: formatRelativeTime(item.createdAtMs, now),
  };
}

export async function loadWorkInboxRows(
  port: WorkInboxPort,
  now = Date.now(),
): Promise<WorkInboxRow[]> {
  const items = await port.listWorkInbox();
  return items.map((item) => toWorkInboxRow(item, now));
}
