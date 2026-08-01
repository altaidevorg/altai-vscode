import type * as vscode from "vscode";
import {
  MessageBridge,
  type BridgeEventListener,
  type BridgeRequestHandler,
  type BridgeTransport,
  type MessageBridgeOptions,
} from "../../shared/bridge.js";

export type {
  BridgeEventListener,
  BridgeRequestHandler,
  MessageBridgeOptions,
};

/**
 * Extension Host adapter around the shared MessageBridge.
 * Isolates vscode.Webview postMessage wiring from bridge protocol logic.
 */
export class WebviewBridge {
  private readonly bridge: MessageBridge;

  constructor(webview: vscode.Webview, options: MessageBridgeOptions = {}) {
    this.bridge = new MessageBridge(createWebviewTransport(webview), options);
  }

  get isDisposed(): boolean {
    return this.bridge.isDisposed;
  }

  registerHandler(method: string, handler: BridgeRequestHandler): void {
    this.bridge.registerHandler(method, handler);
  }

  unregisterHandler(method: string): void {
    this.bridge.unregisterHandler(method);
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

  dispose(): void {
    this.bridge.dispose();
  }
}

function createWebviewTransport(webview: vscode.Webview): BridgeTransport {
  return {
    postMessage(message) {
      void webview.postMessage(message);
    },
    subscribe(listener) {
      const subscription = webview.onDidReceiveMessage((data) => {
        listener(data);
      });
      return () => {
        subscription.dispose();
      };
    },
  };
}
