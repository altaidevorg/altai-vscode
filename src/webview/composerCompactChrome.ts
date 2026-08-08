/**
 * Pure helpers for capability-gating context compaction (Desktop status-bar
 * Compact parity — host supplies capability + session id).
 * Shared implementation lives in `@altai/agent-ui` (A6.59).
 */

export {
  canInvokeCompact,
  canMountCompactControl,
  type ComposerCompactFlags,
} from "@altai/agent-ui";
