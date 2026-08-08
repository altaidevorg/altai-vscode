/**
 * Accumulate host usage events into a run token meter (Desktop agentMeta parity).
 * Shared implementation lives in `@altai/agent-ui` (A6.72).
 */

export {
  ZERO_RUN_USAGE,
  accumulateRunUsage,
  formatRunTokenLabel,
  formatTokenCount,
  usageDeltaFromPayload,
  type RunUsageTotals,
  type UsageDelta,
} from "@altai/agent-ui";
