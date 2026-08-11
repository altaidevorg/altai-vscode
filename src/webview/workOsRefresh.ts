export const WORK_INBOX_POLL_INTERVAL_MS = 5_000;

export type CoalescedAsyncGate = {
  request(): Promise<void>;
  cancelPending(): void;
};

/** Run at most one refresh at a time and retain one trailing request. */
export function createCoalescedAsyncGate(
  run: () => Promise<void>,
): CoalescedAsyncGate {
  let inFlight: Promise<void> | null = null;
  let pending = false;
  return {
    cancelPending(): void {
      pending = false;
    },
    request(): Promise<void> {
      if (inFlight) {
        pending = true;
        return inFlight;
      }
      const drain = async () => {
        do {
          pending = false;
          await run();
        } while (pending);
      };
      const current = drain().finally(() => {
        if (inFlight === current) inFlight = null;
      });
      inFlight = current;
      return current;
    },
  };
}

export type WorkInboxRefreshTrigger =
  | "event"
  | "focus"
  | "poll"
  | "surface"
  | "visibility";

export type WorkInboxRefreshContext = {
  surface?: "work" | "inbox";
  previousSurface?: "work" | "inbox";
  visibilityState?: DocumentVisibilityState;
};

/** Pure policy shared by the mounted Operations panel and background reporter. */
export function shouldRequestWorkInboxRefresh(
  trigger: WorkInboxRefreshTrigger,
  context: WorkInboxRefreshContext = {},
): boolean {
  if (trigger === "surface") {
    return (
      context.surface === "inbox" && context.previousSurface !== "inbox"
    );
  }
  if (trigger === "visibility" || trigger === "poll") {
    return context.visibilityState === undefined || context.visibilityState === "visible";
  }
  return true;
}

export type WorkDetailRequestIdentity = {
  generation: number;
  workId: string;
};

/** A detail result may only update the exact selection that requested it. */
export function canCommitWorkDetailRequest(
  request: WorkDetailRequestIdentity,
  currentGeneration: number,
  selectedWorkId: string | null,
): boolean {
  return (
    request.generation === currentGeneration &&
    request.workId === selectedWorkId
  );
}
