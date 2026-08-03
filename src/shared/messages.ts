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

export type HostRpcNotificationPayload = {
  method: string;
  params?: unknown;
};

/** Webview → Extension Host: proxy a JSON-RPC request to the native host. */
export type HostRequestParams = {
  method: string;
  params?: unknown;
};
