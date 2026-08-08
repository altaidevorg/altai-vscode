/**
 * Capability-gated composer follow-up bar (steer / queue) for an active run.
 * Shared policy + chrome in AiComposerFollowupControl (A6.62).
 */

import {
  AiComposerFollowupControl,
  useCapability,
} from "@altai/agent-ui";

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

  return (
    <AiComposerFollowupControl
      hasActiveRun={hasActiveRun}
      hasPrompt={hasPrompt}
      canSteer={canSteer}
      canQueue={canQueue}
      onSteer={onSteer}
      onQueue={onQueue}
    />
  );
}
