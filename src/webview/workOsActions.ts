import type { WorkItem, WorkPort } from "@altai/host-contract";
import type { WorkDetailPrimaryAction } from "./workOsUi.js";

export type WorkOsPort = Pick<
  WorkPort,
  | "listWork"
  | "getWork"
  | "createWork"
  | "transitionWork"
  | "startWork"
  | "markWorkReadyForReview"
  | "reviewWork"
>;

export class WorkActionUnavailableError extends Error {
  readonly code = "run_binding_unavailable";

  constructor() {
    super("Run binding is unavailable until an Attempt is connected to a run.");
    this.name = "WorkActionUnavailableError";
  }
}

export async function executeWorkAction(
  workPort: WorkOsPort,
  detail: WorkItem,
  action: WorkDetailPrimaryAction,
  returnGuidance?: string,
): Promise<WorkItem | null> {
  const revision = {
    workId: detail.id,
    expectedRevision: detail.revision,
  };
  if (action === "ready" || action === "reopen") {
    return workPort.transitionWork({ ...revision, nextState: "ready" });
  }
  if (action === "start") {
    return workPort.startWork(revision);
  }
  if (action === "open_run") {
    // Never mutate durable Work as a substitute for opening a run. The
    // Attempt↔run binding PR will replace this error with the real inspector.
    throw new WorkActionUnavailableError();
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
