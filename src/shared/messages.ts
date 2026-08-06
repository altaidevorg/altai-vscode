/**
 * Typed envelopes for Extension Host ↔ Webview communication.
 * Runtime-validated by parseWebviewMessage; transport by MessageBridge.
 */

export const WEBVIEW_PROTOCOL_VERSION = 1 as const;

export type WebviewMessageType =
  | "request"
  | "response"
  | "event"
  | "error";

export type WebviewEnvelopeBase = {
  protocolVersion: typeof WEBVIEW_PROTOCOL_VERSION;
  type: WebviewMessageType;
  id: string;
};

export type WebviewRequest = WebviewEnvelopeBase & {
  type: "request";
  method: string;
  params?: unknown;
};

export type WebviewResponse = WebviewEnvelopeBase & {
  type: "response";
  result?: unknown;
  error?: WebviewErrorBody;
};

export type WebviewEvent = WebviewEnvelopeBase & {
  type: "event";
  event: string;
  payload?: unknown;
};

export type WebviewErrorMessage = WebviewEnvelopeBase & {
  type: "error";
  error: WebviewErrorBody;
};

export type WebviewErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type WebviewMessage =
  | WebviewRequest
  | WebviewResponse
  | WebviewEvent
  | WebviewErrorMessage;

export type HostStatusPayload = {
  status: "disconnected" | "connecting" | "ready" | "error";
  message: string;
  extensionVersion: string;
  /** Stable host diagnostic code when status is error (or trust-gated). */
  diagnosticCode?: string;
};

export const HOST_STATUS_EVENT = "host.status" as const;

/** Native JSON-RPC notification forwarded from the agent host (e.g. run/event). */
export const HOST_RPC_NOTIFICATION_EVENT = "host.rpc.notification" as const;

/**
 * Extension Host → Webview: open the Operations surface on a secondary route.
 * Used by command palette deep-links; the panel is capability-gated client-side.
 */
export const OPEN_OPERATIONS_EVENT = "operations.open" as const;

/**
 * Extension Host → Webview: switch to Chat and attach the active editor
 * selection as composer context (no secrets; text only).
 */
export const OPEN_CHAT_WITH_SELECTION_EVENT = "chat.attachSelection" as const;

/**
 * Extension Host → Webview: switch to Chat and attach the active workspace
 * file as a URI composer attachment (no file contents in the event).
 */
export const OPEN_CHAT_WITH_FILE_EVENT = "chat.attachFile" as const;

/**
 * Extension Host → Webview: switch to the Settings surface (presentation only).
 */
export const OPEN_SETTINGS_EVENT = "settings.open" as const;

export type OpenSettingsPayload = {
  /** Unique key so remounted/idempotent opens re-apply. */
  key: number;
};

export type OperationsDeepLinkView =
  | "overview"
  | "work"
  | "runs"
  | "inbox";

export type OperationsDeepLinkWorkHubView = "runs" | "scheduled";

export type OpenOperationsPayload = {
  /** Unique key so remounted/idempotent opens re-apply. */
  key: number;
  view: OperationsDeepLinkView;
  workHubView?: OperationsDeepLinkWorkHubView;
  /** Open the new-task composer on Work/Runs surfaces. */
  composeTask?: boolean;
  /** Open the new-automation composer on Work/Scheduled. */
  composeAutomation?: boolean;
  /** Prefill title when composing (e.g. TaskRunCard reuse). */
  draftTitle?: string;
};

export type HostRpcNotificationPayload = {
  method: string;
  params?: unknown;
};

/** Webview → Extension Host: proxy a JSON-RPC request to the native host. */
export type HostRequestParams = {
  method: string;
  params?: unknown;
};

/** Webview → Extension Host: invoke a capability-limited VS Code adapter. */
export type WorkspaceRequestParams = {
  method: string;
  params?: unknown;
};
