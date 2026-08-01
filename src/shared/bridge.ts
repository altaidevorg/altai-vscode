/**
 * Typed request/response/event bridge for Extension Host ↔ Webview.
 * Transport-agnostic so unit tests can use in-memory peers.
 */

import {
  WEBVIEW_PROTOCOL_VERSION,
  type WebviewErrorBody,
  type WebviewEvent,
  type WebviewMessage,
  type WebviewRequest,
  type WebviewResponse,
} from "./messages.js";
import { createMessageId } from "./messageId.js";
import { parseWebviewMessage } from "./validation.js";

export const DEFAULT_BRIDGE_TIMEOUT_MS = 10_000;

export type BridgeTransport = {
  postMessage(message: unknown): void;
  subscribe(listener: (data: unknown) => void): () => void;
};

export type BridgeRequestHandler = (
  params: unknown,
) => unknown | Promise<unknown>;

export type BridgeEventListener = (payload: unknown) => void;

export type MessageBridgeOptions = {
  defaultTimeoutMs?: number;
  createId?: () => string;
  onInvalidMessage?: (raw: unknown) => void;
  onUnhandledRequest?: (method: string, id: string) => void;
  onUnknownEvent?: (event: string, id: string) => void;
};

export class BridgeError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(body: WebviewErrorBody) {
    super(body.message);
    this.name = "BridgeError";
    this.code = body.code;
    if (Object.prototype.hasOwnProperty.call(body, "details")) {
      this.details = body.details;
    }
  }
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class MessageBridge {
  private readonly defaultTimeoutMs: number;
  private readonly createId: () => string;
  private readonly onInvalidMessage: ((raw: unknown) => void) | undefined;
  private readonly onUnhandledRequest:
    | ((method: string, id: string) => void)
    | undefined;
  private readonly onUnknownEvent:
    | ((event: string, id: string) => void)
    | undefined;

  private readonly handlers = new Map<string, BridgeRequestHandler>();
  private readonly eventListeners = new Map<string, Set<BridgeEventListener>>();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly unsubscribeTransport: () => void;
  private disposed = false;

  constructor(
    private readonly transport: BridgeTransport,
    options: MessageBridgeOptions = {},
  ) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_BRIDGE_TIMEOUT_MS;
    this.createId = options.createId ?? (() => createMessageId("msg"));
    this.onInvalidMessage = options.onInvalidMessage;
    this.onUnhandledRequest = options.onUnhandledRequest;
    this.onUnknownEvent = options.onUnknownEvent;
    this.unsubscribeTransport = this.transport.subscribe((data) => {
      this.onTransportMessage(data);
    });
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  registerHandler(method: string, handler: BridgeRequestHandler): void {
    this.assertAlive();
    if (method.length === 0) {
      throw new Error("Bridge handler method must be non-empty");
    }
    this.handlers.set(method, handler);
  }

  unregisterHandler(method: string): void {
    this.handlers.delete(method);
  }

  onEvent(event: string, listener: BridgeEventListener): () => void {
    this.assertAlive();
    let set = this.eventListeners.get(event);
    if (!set) {
      set = new Set();
      this.eventListeners.set(event, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) {
        this.eventListeners.delete(event);
      }
    };
  }

  async request(
    method: string,
    options: { params?: unknown; timeoutMs?: number } = {},
  ): Promise<unknown> {
    this.assertAlive();

    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const id = this.createId();
    const envelope: WebviewRequest = {
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "request",
      id,
      method,
    };
    if (Object.prototype.hasOwnProperty.call(options, "params")) {
      envelope.params = options.params;
    }

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new BridgeError({
            code: "timeout",
            message: `Request "${method}" timed out after ${timeoutMs}ms`,
            details: { method, id, timeoutMs },
          }),
        );
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      try {
        this.transport.postMessage(envelope);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  postEvent(event: string, payload?: unknown): void {
    this.assertAlive();
    const envelope: WebviewEvent = {
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "event",
      id: this.createId(),
      event,
      ...(payload !== undefined ? { payload } : {}),
    };
    this.transport.postMessage(envelope);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.unsubscribeTransport();
    this.handlers.clear();
    this.eventListeners.clear();

    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(
        new BridgeError({
          code: "disposed",
          message: "Bridge disposed before response",
          details: { id },
        }),
      );
    }
    this.pending.clear();
  }

  private onTransportMessage(raw: unknown): void {
    if (this.disposed) {
      return;
    }

    const message = parseWebviewMessage(raw);
    if (!message) {
      this.onInvalidMessage?.(raw);
      return;
    }

    switch (message.type) {
      case "request":
        void this.dispatchRequest(message);
        return;
      case "response":
      case "error":
        this.dispatchResponse(message);
        return;
      case "event":
        this.dispatchEvent(message);
        return;
      default: {
        const _exhaustive: never = message;
        void _exhaustive;
      }
    }
  }

  private async dispatchRequest(message: WebviewRequest): Promise<void> {
    const handler = this.handlers.get(message.method);
    if (!handler) {
      this.onUnhandledRequest?.(message.method, message.id);
      this.postResponse(message.id, {
        error: {
          code: "method_not_found",
          message: `No handler for method "${message.method}"`,
          details: { method: message.method },
        },
      });
      return;
    }

    try {
      const result = await handler(
        Object.prototype.hasOwnProperty.call(message, "params")
          ? message.params
          : undefined,
      );
      this.postResponse(message.id, { result });
    } catch (error) {
      const body = toErrorBody(error);
      this.postResponse(message.id, { error: body });
    }
  }

  private dispatchResponse(message: WebviewResponse | WebviewMessage): void {
    if (message.type !== "response" && message.type !== "error") {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(message.id);

    if (message.type === "error") {
      pending.reject(new BridgeError(message.error));
      return;
    }

    if (message.error) {
      pending.reject(new BridgeError(message.error));
      return;
    }

    pending.resolve(
      Object.prototype.hasOwnProperty.call(message, "result")
        ? message.result
        : undefined,
    );
  }

  private dispatchEvent(message: WebviewEvent): void {
    const listeners = this.eventListeners.get(message.event);
    if (!listeners || listeners.size === 0) {
      this.onUnknownEvent?.(message.event, message.id);
      return;
    }

    const payload = Object.prototype.hasOwnProperty.call(message, "payload")
      ? message.payload
      : undefined;
    for (const listener of [...listeners]) {
      try {
        listener(payload);
      } catch {
        // Event listeners must not break the bridge.
      }
    }
  }

  private postResponse(
    id: string,
    body: { result?: unknown; error?: WebviewErrorBody },
  ): void {
    if (this.disposed) {
      return;
    }

    const envelope: WebviewResponse = {
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "response",
      id,
      ...(Object.prototype.hasOwnProperty.call(body, "result")
        ? { result: body.result }
        : {}),
      ...(body.error ? { error: body.error } : {}),
    };
    this.transport.postMessage(envelope);
  }

  private assertAlive(): void {
    if (this.disposed) {
      throw new BridgeError({
        code: "disposed",
        message: "Bridge is disposed",
      });
    }
  }
}

function toErrorBody(error: unknown): WebviewErrorBody {
  if (error instanceof BridgeError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    };
  }
  if (error instanceof Error) {
    return {
      code: "handler_error",
      message: error.message,
    };
  }
  return {
    code: "handler_error",
    message: "Unknown handler error",
    details: { error },
  };
}

/**
 * Pair of linked in-memory transports for unit tests.
 */
export function createLinkedTransports(): [BridgeTransport, BridgeTransport] {
  type Listener = (data: unknown) => void;
  const aListeners = new Set<Listener>();
  const bListeners = new Set<Listener>();

  const a: BridgeTransport = {
    postMessage(message) {
      for (const listener of [...bListeners]) {
        listener(message);
      }
    },
    subscribe(listener) {
      aListeners.add(listener);
      return () => {
        aListeners.delete(listener);
      };
    },
  };

  const b: BridgeTransport = {
    postMessage(message) {
      for (const listener of [...aListeners]) {
        listener(message);
      }
    },
    subscribe(listener) {
      bListeners.add(listener);
      return () => {
        bListeners.delete(listener);
      };
    },
  };

  return [a, b];
}
