/**
 * Presentation-only Webview state persisted via vscodeApi getState/setState.
 * Must not hold privileged host context or secrets.
 */

export type PersistedHostStatus = {
  status: string;
  message: string;
  extensionVersion: string;
  diagnosticCode?: string;
};

/** Top-level Chat vs Operations surface. */
export type PersistedAltaiSurface = "chat" | "operations";

/** Capability-gated Operations secondary route (agents/governance stay deferred). */
export type PersistedOperationsView =
  | "overview"
  | "work"
  | "runs"
  | "inbox";

export type PersistedWorkHubView = "runs" | "scheduled";

export type PersistedWebviewState = {
  hostStatus?: PersistedHostStatus;
  surface?: PersistedAltaiSurface;
  operationsView?: PersistedOperationsView;
  workHubView?: PersistedWorkHubView;
};

const SURFACES = new Set<PersistedAltaiSurface>(["chat", "operations"]);
const OPS_VIEWS = new Set<PersistedOperationsView>([
  "overview",
  "work",
  "runs",
  "inbox",
]);
const WORK_HUB = new Set<PersistedWorkHubView>(["runs", "scheduled"]);

/**
 * Accept an arbitrary getState() blob. Malformed fields are dropped so partial
 * recovery remains possible (e.g. surface survives a bad hostStatus).
 */
export function parsePersistedWebviewState(
  value: unknown,
): PersistedWebviewState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const next: PersistedWebviewState = {};

  if (isPersistedHostStatus(record.hostStatus)) {
    next.hostStatus = record.hostStatus;
  }
  if (
    typeof record.surface === "string" &&
    SURFACES.has(record.surface as PersistedAltaiSurface)
  ) {
    next.surface = record.surface as PersistedAltaiSurface;
  }
  if (
    typeof record.operationsView === "string" &&
    OPS_VIEWS.has(record.operationsView as PersistedOperationsView)
  ) {
    next.operationsView = record.operationsView as PersistedOperationsView;
  }
  if (
    typeof record.workHubView === "string" &&
    WORK_HUB.has(record.workHubView as PersistedWorkHubView)
  ) {
    next.workHubView = record.workHubView as PersistedWorkHubView;
  }

  return next;
}

/** Shallow merge for presentation patches; never invents privileged fields. */
export function mergePersistedWebviewState(
  current: PersistedWebviewState,
  patch: PersistedWebviewState,
): PersistedWebviewState {
  return { ...current, ...patch };
}

function isPersistedHostStatus(value: unknown): value is PersistedHostStatus {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.status !== "string" ||
    typeof record.message !== "string" ||
    typeof record.extensionVersion !== "string"
  ) {
    return false;
  }
  if (
    Object.prototype.hasOwnProperty.call(record, "diagnosticCode") &&
    typeof record.diagnosticCode !== "string"
  ) {
    return false;
  }
  return true;
}
