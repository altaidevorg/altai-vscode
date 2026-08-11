import type { WorkAttempt } from "@altai/host-contract";
import type { WorkDetailPrimaryAction } from "./workOsUi.js";

const ACTIVE_PHASES = new Set(["queued", "running", "waiting"]);

export function latestBoundAttempt(
  attempts: readonly WorkAttempt[],
): WorkAttempt | null {
  return (
    attempts.find(
      (attempt) =>
        typeof attempt.chatId === "string" &&
        attempt.chatId.length > 0 &&
        typeof attempt.runId === "string" &&
        attempt.runId.length > 0,
    ) ?? null
  );
}

export function primaryWorkActions(
  state: string,
  attempts: readonly WorkAttempt[],
  options: { attemptRunsAvailable: boolean; replayAvailable: boolean },
): WorkDetailPrimaryAction[] {
  const active = attempts.find((attempt) => ACTIVE_PHASES.has(attempt.phase));
  const canOpenActive = Boolean(
    active?.chatId &&
      active.runId &&
      options.attemptRunsAvailable &&
      options.replayAvailable,
  );
  switch (state) {
    case "backlog":
      return ["ready"];
    case "ready":
      if (active) return canOpenActive ? ["open_run"] : [];
      return options.attemptRunsAvailable ? ["start"] : [];
    case "in_progress":
      return canOpenActive ? ["open_run"] : [];
    case "in_review":
      return ["accept", "return"];
    case "done":
    case "cancelled":
      return ["reopen"];
    default:
      return [];
  }
}
