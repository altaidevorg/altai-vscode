/**
 * Capability-gated overview metric tiles.
 *
 * Shared `OperationsOverview` still lacks metric `onOpen`; host wraps
 * `InspectorMetric` so tiles can deep-link without a second metric design.
 */

import { InspectorMetric } from "@altai/agent-ui";

export type OverviewMetricTile = {
  label: string;
  value: string;
  onOpen?: () => void;
};

export type OperationsOverviewMetricsProps = {
  metrics: OverviewMetricTile[];
};

export function OperationsOverviewMetrics({
  metrics,
}: OperationsOverviewMetricsProps) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <div
      className="altai-ops-metrics"
      role="navigation"
      aria-label="Operations metrics"
    >
      {metrics.map((metric) =>
        metric.onOpen ? (
          <button
            key={metric.label}
            type="button"
            className="altai-ops-metric-tile"
            onClick={metric.onOpen}
          >
            <InspectorMetric label={metric.label} value={metric.value} />
          </button>
        ) : (
          <div key={metric.label} className="altai-ops-metric-tile is-static">
            <InspectorMetric label={metric.label} value={metric.value} />
          </div>
        ),
      )}
    </div>
  );
}
