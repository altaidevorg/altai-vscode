/**
 * Aggregation model for the VS Code Operations Overview adapter.
 * Shared implementation lives in `@altai/agent-ui` (A6.104).
 */

export {
  EMPTY_OPERATIONS_DATA,
  buildOperationsOverview,
  countOperationsAttention,
  destinationForOverviewMetric,
  destinationForOverviewRowId,
  overviewActiveRunId,
  overviewFailedRunId,
  overviewUnreadInboxId,
  withOverviewMetricNavigation,
  withOverviewRowNavigation,
  type OperationsOverviewData,
  type OperationsOverviewViewModel,
  type OverviewNavFlags,
  type OverviewRowDestination,
} from "@altai/agent-ui";
