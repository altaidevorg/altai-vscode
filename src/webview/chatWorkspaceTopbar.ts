/**
 * Pure helpers for capability-gating the shared WorkspaceTopbarActions cluster.
 * Shared implementation lives in `@altai/agent-ui` (A6.95).
 */

export {
  canMountWorkspaceTopbar,
  workspaceTopbarInboxOpen,
  workspaceTopbarWorkOpen,
  type WorkspaceTopbarFlags,
} from "@altai/agent-ui";
