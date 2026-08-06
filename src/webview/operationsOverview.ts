/**
 * Aggregation model for the VS Code Operations Overview adapter.
 *
 * Pure mapping from Work/Inbox port data to the shared `OperationsOverview`
 * props. Kept free of React and ports so it stays unit-testable in a node
 * environment. Until a canonical `OperationsSummary` projection exists, this
 * adapter composes the overview from the existing domain slices.
 */

import type {
  OperationsOverviewMetric,
  OperationsOverviewRow,
} from "@altai/agent-ui";
import type {
  AutomationInfo,
  NotificationInfo,
  TaskRunInfo,
} from "@altai/host-contract";

export type OperationsOverviewData = {
  taskRuns: TaskRunInfo[];
  automations: AutomationInfo[];
  notifications: NotificationInfo[];
};

export type OperationsOverviewViewModel = {
  metrics: OperationsOverviewMetric[];
  attention: OperationsOverviewRow[];
  progressing: OperationsOverviewRow[];
};

export const EMPTY_OPERATIONS_DATA: OperationsOverviewData = {
  taskRuns: [],
  automations: [],
  notifications: [],
};

/** Rows per section; the overview summarizes, full lists live in Work/Inbox. */
const SECTION_LIMIT = 5;

const RUN_STATUS_LABELS: Record<TaskRunInfo["status"], string> = {
  queued: "Queued",
  running: "Working",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Stopped",
};

export function buildOperationsOverview(
  data: OperationsOverviewData,
): OperationsOverviewViewModel {
  const activeRuns = data.taskRuns.filter(
    (run) => run.status === "queued" || run.status === "running",
  );
  const failedRuns = data.taskRuns.filter((run) => run.status === "failed");
  const unseen = data.notifications.filter((item) => !item.seen);
  const enabledAutomations = data.automations.filter((item) => item.enabled);

  const metrics: OperationsOverviewMetric[] = [
    { label: "Active runs", value: String(activeRuns.length) },
    {
      label: "Needs attention",
      value: String(failedRuns.length + unseen.length),
    },
    { label: "Scheduled", value: String(enabledAutomations.length) },
  ];

  const attention: OperationsOverviewRow[] = [
    ...failedRuns.map((run) => ({
      id: `run:${run.id}`,
      title: run.title,
      statusLabel: RUN_STATUS_LABELS.failed,
      tone: "attention" as const,
    })),
    ...unseen.map((item) => ({
      id: `inbox:${item.id}`,
      title: item.title,
      statusLabel: "Unread",
      tone: "attention" as const,
      ...(item.body ? { detail: item.body } : {}),
    })),
  ].slice(0, SECTION_LIMIT);

  const progressing: OperationsOverviewRow[] = [
    ...activeRuns.map((run) => ({
      id: `run:${run.id}`,
      title: run.title,
      statusLabel: RUN_STATUS_LABELS[run.status],
    })),
    ...enabledAutomations.map((item) => ({
      id: `automation:${item.id}`,
      title: item.title,
      statusLabel: "Scheduled",
      detail: automationScheduleLabel(item),
    })),
  ].slice(0, SECTION_LIMIT);

  return { metrics, attention, progressing };
}

function automationScheduleLabel(automation: AutomationInfo): string {
  const { schedule } = automation;
  if (schedule.kind === "once") {
    return `Once · ${schedule.at}`;
  }
  const ms = schedule.everyMs;
  if (ms % 3_600_000 === 0) {
    return `Every ${ms / 3_600_000}h`;
  }
  if (ms % 60_000 === 0) {
    return `Every ${ms / 60_000}m`;
  }
  return `Every ${Math.round(ms / 1000)}s`;
}
