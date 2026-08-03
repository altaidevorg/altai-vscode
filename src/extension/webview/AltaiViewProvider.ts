import * as vscode from "vscode";
import {
  HOST_STATUS_EVENT,
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

  private getHostStatus(): HostStatusPayload {
    return this.hostManager.getStatus();
  }

  private disposeBridge(): void {
    this.bridge?.dispose();
    this.bridge = undefined;
  }
}
