/**
 * Pure helpers for Operations deep-link payloads.
 * Shared by Extension Host commands and the Webview (no React / vscode APIs).
 */

import type {
  OpenOperationsPayload,
  OperationsDeepLinkView,
  OperationsDeepLinkWorkHubView,
} from "./messages.js";

const VIEWS = new Set<OperationsDeepLinkView>([
  "overview",
  "work",
  "runs",
  "inbox",
]);

const WORK_HUB = new Set<OperationsDeepLinkWorkHubView>([
  "runs",
  "scheduled",
]);

/**
 * Runtime-validate an `operations.open` event payload.
 * Returns null when the payload is malformed.
 */
export function parseOpenOperationsPayload(
  value: unknown,
): OpenOperationsPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.key !== "number" || !Number.isFinite(record.key)) {
    return null;
  }
  if (
    typeof record.view !== "string" ||
    !VIEWS.has(record.view as OperationsDeepLinkView)
  ) {
    return null;
  }
  const payload: OpenOperationsPayload = {
    key: record.key,
    view: record.view as OperationsDeepLinkView,
  };
  if (record.workHubView !== undefined) {
    if (
      typeof record.workHubView !== "string" ||
      !WORK_HUB.has(record.workHubView as OperationsDeepLinkWorkHubView)
    ) {
      return null;
    }
    payload.workHubView = record.workHubView as OperationsDeepLinkWorkHubView;
  }
  return payload;
}

export function buildOpenOperationsPayload(input: {
  view?: OperationsDeepLinkView;
  workHubView?: OperationsDeepLinkWorkHubView;
  key?: number;
}): OpenOperationsPayload {
  const payload: OpenOperationsPayload = {
    key: input.key ?? Date.now(),
    view: input.view ?? "overview",
  };
  if (input.workHubView) {
    payload.workHubView = input.workHubView;
  }
  return payload;
}
