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

/** Top-level Chat / Operations / Settings surface. */
export type PersistedAltaiSurface = "chat" | "operations" | "settings";

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
  /** Last Chat conversation focused from Operations or a run. */
  activeChatId?: string;
  /**
   * Unsent Chat composer text. Presentation-only; never secrets.
   * Capped on parse/write so getState stays small.
   */
  composerDraft?: string;
};

/** Max characters retained for the reloadable composer draft. */
export const MAX_COMPOSER_DRAFT_CHARS = 8_000;

/**
 * Normalize unsent composer text for Webview persistence (trim right only so
 * intentional leading whitespace survives; empty becomes undefined).
 */
export function normalizeComposerDraft(
  value: unknown,
  maxChars: number = MAX_COMPOSER_DRAFT_CHARS,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  // Keep trailing newlines the user may still be editing; drop pure empty.
  const capped = value.length > maxChars ? value.slice(0, maxChars) : value;
  if (capped.length === 0) {
    return undefined;
  }
  // Reject control-heavy garbage (except common whitespace).
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(capped)) {
    return undefined;
  }
  return capped;
}

const SURFACES = new Set<PersistedAltaiSurface>([
  "chat",
  "operations",
  "settings",
]);
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
  if (
    typeof record.activeChatId === "string" &&
    record.activeChatId.length > 0 &&
    record.activeChatId.length <= 512
  ) {
    next.activeChatId = record.activeChatId;
  }
  const draft = normalizeComposerDraft(record.composerDraft);
  if (draft !== undefined) {
    next.composerDraft = draft;
  }

  return next;
}

/** Shallow merge for presentation patches; never invents privileged fields. */
export function mergePersistedWebviewState(
  current: PersistedWebviewState,
  patch: PersistedWebviewState,
): PersistedWebviewState {
  const next: PersistedWebviewState = { ...current, ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "composerDraft")) {
    const draft = normalizeComposerDraft(patch.composerDraft);
    if (draft === undefined) {
      delete next.composerDraft;
    } else {
      next.composerDraft = draft;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "activeChatId")) {
    const id =
      typeof patch.activeChatId === "string" ? patch.activeChatId.trim() : "";
    if (!id || id.length > 512) {
      delete next.activeChatId;
    } else {
      next.activeChatId = id;
    }
  }
  return next;
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
