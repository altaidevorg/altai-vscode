import type {
  WorkItem,
  WorkPort,
  WorkStartRunResult,
} from "@altai/host-contract";
import type { WorkDetailPrimaryAction } from "./workOsUi.js";

export type WorkOsPort = Pick<
  WorkPort,
  | "listWork"
  | "getWork"
  | "createWork"
  | "transitionWork"
  | "startWorkRun"
  | "listWorkAttempts"
  | "markWorkReadyForReview"
  | "reviewWork"
>;

export async function executeWorkAction(
  workPort: WorkOsPort,
  detail: WorkItem,
  action: WorkDetailPrimaryAction,
  returnGuidance?: string,
): Promise<WorkItem | WorkStartRunResult | null> {
  const revision = {
    workId: detail.id,
    expectedRevision: detail.revision,
  };
  if (action === "ready" || action === "reopen") {
    return workPort.transitionWork({ ...revision, nextState: "ready" });
  }
  if (action === "start") {
    return workPort.startWorkRun(revision);
  }
  if (action === "open_run") {
    // Navigation is handled by WorkOsPanel's isolated exact-run inspector.
    return null;
  }
  if (action === "accept") {
    return workPort.reviewWork({ ...revision, accept: true, guidance: "" });
  }
  if (action === "return") {
    const guidance = returnGuidance?.trim() ?? "";
    if (!guidance) return null;
    return workPort.reviewWork({
      ...revision,
      accept: false,
      guidance,
    });
  }
  return null;
}
