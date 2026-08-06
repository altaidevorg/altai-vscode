/**
 * Webview-side Operations deep-link view resolution (capability-aware).
 */

import type { OperationsView, WorkHubView } from "@altai/agent-ui";
import type {
  OperationsDeepLinkView,
  OperationsDeepLinkWorkHubView,
} from "../shared/messages.js";
import {
  buildOpenOperationsPayload,
  parseOpenOperationsPayload,
} from "../shared/operationsDeepLink.js";
import type { OperationsCapabilityFlags } from "./operationsRoutes.js";
import { resolveAvailableOperationsViews } from "./operationsRoutes.js";

export { buildOpenOperationsPayload, parseOpenOperationsPayload };

/**
 * Map a deep-link target onto an available Operations secondary view.
 * Unavailable targets fall back to overview rather than enabling placeholders.
 */
export function resolveDeepLinkOperationsView(
  requested: OperationsDeepLinkView,
  flags: OperationsCapabilityFlags,
): OperationsView {
  const available = resolveAvailableOperationsViews(flags);
  if (available.includes(requested as OperationsView)) {
    return requested as OperationsView;
  }
  return "overview";
}

/**
 * Map deep-link hub strip selection onto WorkHubView when Work is available.
 */
export function resolveDeepLinkWorkHubView(
  requested: OperationsDeepLinkWorkHubView | undefined,
  flags: OperationsCapabilityFlags,
): WorkHubView {
  if (requested === "scheduled" && flags.automations) {
    return "scheduled";
  }
  if (flags.taskRuns) {
    return "runs";
  }
  return "scheduled";
}
