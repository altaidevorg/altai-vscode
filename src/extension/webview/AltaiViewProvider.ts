import * as vscode from "vscode";
import {
  HOST_RPC_NOTIFICATION_EVENT,
  HOST_STATUS_EVENT,
  type HostRequestParams,
  type HostStatusPayload,
} from "../../shared/messages.js";
import { createNonce } from "../../shared/nonce.js";
import type { HostManager } from "../host/HostManager.js";
import { getOutputChannel } from "../output.js";
import { WebviewBridge } from "./WebviewBridge.js";
import { getWebviewHtml } from "./webviewHtml.js";

export class AltaiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "altai.sidePanel";

  private view: vscode.WebviewView | undefined;
  private bridge: WebviewBridge | undefined;
  private removeNotificationListener: (() => void) | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly hostManager: HostManager,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.disposeBridge();
    this.view = webviewView;
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview"),
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
      ],
    };

    const nonce = createNonce();
    webview.html = getWebviewHtml({
      webview,
      extensionUri: this.context.extensionUri,
      nonce,
    });

    const bridge = new WebviewBridge(webview, {
      onInvalidMessage: () => {
        getOutputChannel().appendLine(
          "[altai] ignored invalid webview message",
        );
      },
      onUnhandledRequest: (method) => {
        getOutputChannel().appendLine(
          `[altai] unhandled webview request: ${method}`,
        );
      },
    });
    this.bridge = bridge;

    bridge.registerHandler("host.getStatus", () => this.getHostStatus());
    bridge.registerHandler("host.request", (params) =>
      this.proxyHostRequest(params),
    );

    const onNotification = (notification: {
      method: string;
      params?: unknown;
    }): void => {
      const payload: { method: string; params?: unknown } = {
        method: notification.method,
      };
      if (notification.params !== undefined) {
        payload.params = notification.params;
      }
      bridge.postEvent(HOST_RPC_NOTIFICATION_EVENT, payload);
    };
    this.hostManager.on("notification", onNotification);
    this.removeNotificationListener = () => {
      this.hostManager.off("notification", onNotification);
    };

    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
      }
      if (this.bridge === bridge) {
        this.disposeBridge();
      }
    });

    bridge.postEvent(HOST_STATUS_EVENT, this.getHostStatus());
    getOutputChannel().appendLine("[altai] webview resolved");
  }

  publishHostStatus(status: HostStatusPayload): void {
    this.bridge?.postEvent(HOST_STATUS_EVENT, status);
  }

  private async proxyHostRequest(params: unknown): Promise<unknown> {
    const parsed = parseHostRequestParams(params);
    if (!parsed) {
      throw Object.assign(new Error("invalid_host_request_params"), {
        code: "invalid_params",
      });
    }
    return this.hostManager.request(parsed.method, parsed.params);
  }

  private getHostStatus(): HostStatusPayload {
    return this.hostManager.getStatus();
  }

  private disposeBridge(): void {
    this.removeNotificationListener?.();
    this.removeNotificationListener = undefined;
    this.bridge?.dispose();
    this.bridge = undefined;
  }
}

function parseHostRequestParams(value: unknown): HostRequestParams | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.method !== "string" || record.method.trim() === "") {
    return undefined;
  }
  const out: HostRequestParams = { method: record.method };
  if (Object.prototype.hasOwnProperty.call(record, "params")) {
    out.params = record.params;
  }
  return out;
}
