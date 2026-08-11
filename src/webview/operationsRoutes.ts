/**
 * Capability-gated Operations secondary routes for the VS Code host.
 * Pure helpers — unit-testable without React or ports.
 *
 * Work OS Milestone 1: primary nav is Work + Inbox only (SCREENS.md).
 * Overview/Runs remain in types for legacy deep-link remap.
 *
 * NOTE: Keep this list in sync with `@altai/agent-ui` WORK_OS_VIEWS. CI may
 * resolve agent-ui from npm before that export is published, so the constant
 * is local here.
 */

import type { OperationsView, TaskRunStatus } from "@altai/agent-ui";
import type {
  AutomationInfo,
  NotificationInfo,
  TaskRunInfo,
} from "@altai/host-contract";

/** Milestone 1 Work OS destinations (match altai-app SCREENS.md). */
export const WORK_OS_VIEWS = ["work", "inbox"] as const satisfies readonly OperationsView[];

export type OperationsCapabilityFlags = {
  taskRuns: boolean;
  automations: boolean;
  inbox: boolean;
};

/**
 * Milestone 1 Work OS destinations — match altai-app Desktop/Studio.
 * Capability flags are retained for call-site compatibility but do not expand
 * primary nav beyond Work + Inbox.
 */
export function resolveAvailableOperationsViews(
  _flags: OperationsCapabilityFlags,
): OperationsView[] {
  return [...WORK_OS_VIEWS];
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
