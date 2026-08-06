/**
 * Pure policy for composer steer / queue follow-up controls while a run is
 * active (Desktop composer parity — host supplies capabilities + run state).
 * Shared implementation lives in `@altai/agent-ui` (Wave 4 / A6.11).
 */

export {
  composerFollowupVisibility,
  resolveComposerSubmitMode,
  type ComposerFollowupMode,
  type ComposerFollowupPolicyInput,
  type ComposerFollowupVisibility,
} from "@altai/agent-ui";
