/**
 * Re-export shared recovery allowlist for Webview chrome imports.
 * Implementation lives in `@altai/agent-ui` (A6.106). Extension Host keeps a
 * local pure mirror under `shared/hostRecoveryCommands` so the host bundle
 * never imports the agent-ui React graph.
 */

export {
  ALTAI_RECOVERY_COMMANDS,
  isAltaiRecoveryCommand,
  listRecoveryActions,
  type AltaiRecoveryCommand,
  type RecoveryAction,
} from "@altai/agent-ui";
