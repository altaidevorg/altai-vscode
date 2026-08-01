import * as vscode from "vscode";
import {
  HOST_STATUS_EVENT,
  WEBVIEW_PROTOCOL_VERSION,
  type HostStatusPayload,
  type WebviewEvent,
} from "../../shared/messages.js";
import { createNonce } from "../../shared/nonce.js";
import { createSecureId } from "../../shared/secureRandom.js";
import { parseWebviewMessage } from "../../shared/validation.js";
import { COMPATIBILITY } from "../compatibility.js";
import { getOutputChannel } from "../output.js";
import { getWebviewHtml } from "./webviewHtml.js";

export class AltaiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "altai.sidePanel";

  private view: vscode.WebviewView | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
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

    webview.onDidReceiveMessage((raw) => {
      const message = parseWebviewMessage(raw);
      if (!message) {
        getOutputChannel().appendLine(
          "[altai] ignored invalid webview message",
        );
        return;
      }

      if (message.type === "request" && message.method === "host.getStatus") {
        this.postHostStatus();
      }
    });

    this.postHostStatus();
    getOutputChannel().appendLine("[altai] webview resolved");
  }

  private postHostStatus(): void {
    if (!this.view) {
      return;
    }

    const payload: HostStatusPayload = {
      status: "disconnected",
      message: "ALTAI host not connected",
      extensionVersion: COMPATIBILITY.extension,
    };

    const event: WebviewEvent = {
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "event",
      id: createSecureId("evt"),
      event: HOST_STATUS_EVENT,
      payload,
    };

    void this.view.webview.postMessage(event);
  }
}
