/**
 * Webview-side bridge client. Uses acquireVsCodeApi for messaging and
 * persisted presentation state (no retainContextWhenHidden dependency).
 */

import {
  MessageBridge,
  type BridgeEventListener,
  type BridgeRequestHandler,
  type BridgeTransport,
  type MessageBridgeOptions,
} from "../shared/bridge.js";
import {
  parsePersistedWebviewState,
  type PersistedWebviewState,
} from "@altai/agent-ui";

export type VsCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

export type WebviewClientOptions = MessageBridgeOptions & {
  vscodeApi: VsCodeApi;
};

export type { PersistedWebviewState };

export class WebviewClient {
  private readonly bridge: MessageBridge;
  private readonly vscodeApi: VsCodeApi;

  constructor(options: WebviewClientOptions) {
    const { vscodeApi, ...bridgeOptions } = options;
    this.vscodeApi = vscodeApi;
    this.bridge = new MessageBridge(
      createVsCodeTransport(vscodeApi),
      bridgeOptions,
    );
  }

  get isDisposed(): boolean {
    return this.bridge.isDisposed;
  }

  registerHandler(method: string, handler: BridgeRequestHandler): void {
    this.bridge.registerHandler(method, handler);
  }

  onEvent(event: string, listener: BridgeEventListener): () => void {
    return this.bridge.onEvent(event, listener);
  }

  request(
    method: string,
    options?: { params?: unknown; timeoutMs?: number },
  ): Promise<unknown> {
    return this.bridge.request(method, options);
  }

  postEvent(event: string, payload?: unknown): void {
    this.bridge.postEvent(event, payload);
  }

  getPersistedState(): PersistedWebviewState {
    return parsePersistedWebviewState(this.vscodeApi.getState());
  }

  setPersistedState(state: PersistedWebviewState): void {
    this.vscodeApi.setState(state);
  }

  dispose(): void {
    this.bridge.dispose();
  }
}

function createVsCodeTransport(api: VsCodeApi): BridgeTransport {
  return {
    postMessage(message) {
      api.postMessage(message);
    },
    subscribe(listener) {
      const handler = (event: MessageEvent) => {
        listener(event.data);
      };
      window.addEventListener("message", handler);
      return () => {
        window.removeEventListener("message", handler);
      };
    },
  };
}
