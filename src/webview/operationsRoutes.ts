/**
 * Capability-gated Operations secondary routes for the VS Code host.
 * Pure helpers — unit-testable without React or ports.
 */

import type { OperationsView, TaskRunStatus } from "@altai/agent-ui";
import type {
  AutomationInfo,
  NotificationInfo,
  TaskRunInfo,
} from "@altai/host-contract";

export type OperationsCapabilityFlags = {
  taskRuns: boolean;
  automations: boolean;
  inbox: boolean;
};

/**
 * Overview is always live once the panel mounts. Work/Runs/Inbox enable only
 * when the host advertises the corresponding domain slice.
 */
export function resolveAvailableOperationsViews(
  flags: OperationsCapabilityFlags,
): OperationsView[] {
  const views: OperationsView[] = ["overview"];
  if (flags.taskRuns || flags.automations) {
    views.push("work");
  }
  if (flags.taskRuns) {
    views.push("runs");
  }
  if (flags.inbox) {
    views.push("inbox");
  }
  return views;
}

/** Map host TaskRunInfo status onto shared TaskRunCard status. */
export function mapTaskRunUiStatus(
  status: TaskRunInfo["status"],
): TaskRunStatus {
  switch (status) {
    case "queued":
      return "dispatching";
    case "running":
      return "running";
    case "succeeded":
      return "done";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
  }
}

export function taskRunCreatedAtMs(run: TaskRunInfo): number {
  const ms = Date.parse(run.createdAt);
  return Number.isFinite(ms) ? ms : 0;
}

export function taskRunIsActive(status: TaskRunInfo["status"]): boolean {
  return status === "queued" || status === "running";
}

export function automationScheduleUiLabel(
  automation: AutomationInfo,
): string {
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

export function notificationCreatedAtMs(item: NotificationInfo): number {
  const ms = Date.parse(item.createdAt);
  return Number.isFinite(ms) ? ms : 0;
}
