import {
  WEBVIEW_PROTOCOL_VERSION,
  type WebviewMessage,
  type WebviewMessageType,
} from "./messages.js";

const MESSAGE_TYPES: ReadonlySet<WebviewMessageType> = new Set([
  "request",
  "response",
  "event",
  "error",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Narrow unknown postMessage payloads to a WebviewMessage.
 * Invalid messages return null and must not invoke handlers.
 */
export function parseWebviewMessage(value: unknown): WebviewMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.protocolVersion !== WEBVIEW_PROTOCOL_VERSION) {
    return null;
  }

  if (typeof value.type !== "string" || !MESSAGE_TYPES.has(value.type as WebviewMessageType)) {
    return null;
  }

  if (typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }

  switch (value.type) {
    case "request":
      if (typeof value.method !== "string" || value.method.length === 0) {
        return null;
      }
      return {
        protocolVersion: WEBVIEW_PROTOCOL_VERSION,
        type: "request",
        id: value.id,
        method: value.method,
        ...(Object.prototype.hasOwnProperty.call(value, "params")
          ? { params: value.params }
          : {}),
      };
    case "response": {
      const response: WebviewMessage = {
        protocolVersion: WEBVIEW_PROTOCOL_VERSION,
        type: "response",
        id: value.id,
      };
      if (Object.prototype.hasOwnProperty.call(value, "result")) {
        response.result = value.result;
      }
      if (isRecord(value.error) && typeof value.error.code === "string" && typeof value.error.message === "string") {
        response.error = {
          code: value.error.code,
          message: value.error.message,
          ...(Object.prototype.hasOwnProperty.call(value.error, "details")
            ? { details: value.error.details }
            : {}),
        };
      }
      return response;
    }
    case "event":
      if (typeof value.event !== "string" || value.event.length === 0) {
        return null;
      }
      return {
        protocolVersion: WEBVIEW_PROTOCOL_VERSION,
        type: "event",
        id: value.id,
        event: value.event,
        ...(Object.prototype.hasOwnProperty.call(value, "payload")
          ? { payload: value.payload }
          : {}),
      };
    case "error":
      if (
        !isRecord(value.error) ||
        typeof value.error.code !== "string" ||
        typeof value.error.message !== "string"
      ) {
        return null;
      }
      return {
        protocolVersion: WEBVIEW_PROTOCOL_VERSION,
        type: "error",
        id: value.id,
        error: {
          code: value.error.code,
          message: value.error.message,
          ...(Object.prototype.hasOwnProperty.call(value.error, "details")
            ? { details: value.error.details }
            : {}),
        },
      };
    default:
      return null;
  }
}
