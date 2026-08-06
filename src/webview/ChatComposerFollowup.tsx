/**
 * Capability-gated ComposerFollowupBar (steer / queue) for an active run.
 */

import { ComposerFollowupBar, useCapability } from "@altai/agent-ui";
import { composerFollowupVisibility } from "./composerFollowupChrome.js";

export type ChatComposerFollowupProps = {
  hasActiveRun: boolean;
  hasPrompt: boolean;
  onSteer: () => void;
  onQueue: () => void;
};

export function ChatComposerFollowup({
  hasActiveRun,
  hasPrompt,
  onSteer,
  onQueue,
}: ChatComposerFollowupProps) {
  const canSteer = useCapability("runtime.steerRun");
  const canQueue = useCapability("runtime.queueRun");
  const visibility = composerFollowupVisibility({
    hasActiveRun,
    canStartRun: true,
    canSteer,
    canQueue,
    hasPrompt,
  });

  if (!visibility.showBar) {
    return null;
  }

  return (
    <ComposerFollowupBar
      hint={visibility.hint}
      showSteer={visibility.showSteer}
      showQueue={visibility.showQueue}
      canSteer={visibility.canSteerAction}
      canQueue={visibility.canQueueAction}
      onSteer={onSteer}
      onQueue={onQueue}
      steerTitle="Apply at the active run's next safe boundary"
      queueTitle="Start after the active run terminates"
    />
  );
}
