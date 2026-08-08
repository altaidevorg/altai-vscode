/**
 * Shell-owned attention polling when the Operations surface is not mounted.
 * Shared implementation lives in `@altai/agent-ui` (A6.105).
 */

export {
  fetchOperationsAttentionCount,
  shouldRefreshAttentionOnEvent,
  type AttentionPollFlags,
  type AttentionPollSources,
} from "@altai/agent-ui";
