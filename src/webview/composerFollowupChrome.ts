/**
 * Pure policy for composer steer / queue follow-up controls while a run is
 * active (Desktop composer parity — host supplies capabilities + run state).
 */

export type ComposerFollowupMode = "start" | "steer" | "queue";

export type ComposerFollowupPolicyInput = {
  hasActiveRun: boolean;
  canStartRun: boolean;
  canSteer: boolean;
  canQueue: boolean;
  /** Enter + meta/ctrl → prefer steer when available. */
  preferSteer?: boolean;
  hasPrompt: boolean;
};

export type ComposerFollowupVisibility = {
  showBar: boolean;
  showSteer: boolean;
  showQueue: boolean;
  canSteerAction: boolean;
  canQueueAction: boolean;
  hint: string;
};

/**
 * Whether the shared ComposerFollowupBar should mount and which actions to
 * expose. Actions stay disabled without prompt text or capability.
 */
export function composerFollowupVisibility(
  input: Omit<ComposerFollowupPolicyInput, "preferSteer" | "hasPrompt"> & {
    hasPrompt: boolean;
  },
): ComposerFollowupVisibility {
  const hasRun = input.hasActiveRun;
  const showSteer = hasRun && input.canSteer;
  const showQueue = hasRun && input.canQueue;
  const showBar = showSteer || showQueue;
  return {
    showBar,
    showSteer,
    showQueue,
    canSteerAction: showSteer && input.hasPrompt,
    canQueueAction: showQueue && input.hasPrompt,
    hint: hasRun
      ? input.canSteer
        ? "Enter queues next · ⌘/Ctrl+Enter steers this run"
        : "Enter queues next · starts after the active run ends"
      : "",
  };
}

/**
 * Resolve primary composer submit behavior for keyboard / Send.
 * Prefer steer only when explicitly requested (meta+enter) during an active run.
 */
export function resolveComposerSubmitMode(
  input: ComposerFollowupPolicyInput,
): ComposerFollowupMode {
  if (!input.hasPrompt) {
    return "start";
  }
  if (input.hasActiveRun) {
    if (input.preferSteer && input.canSteer) {
      return "steer";
    }
    if (input.canQueue) {
      return "queue";
    }
    if (input.canSteer) {
      return "steer";
    }
  }
  return "start";
}
