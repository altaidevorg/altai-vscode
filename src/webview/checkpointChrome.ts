/**
 * Pure helpers for capability-gated edit-checkpoint list/restore chrome.
 * Shared implementation lives in `@altai/agent-ui` (A6.92).
 */

export {
  canMountCheckpointChrome,
  canRestoreCheckpoint,
  preferredCheckpointLabel,
  toCheckpointMenuItems,
  type CheckpointChromeFlags,
} from "@altai/agent-ui";
