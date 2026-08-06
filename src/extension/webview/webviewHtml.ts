import * as vscode from "vscode";
import { buildWebviewHtmlDocument } from "./webviewHtmlDocument.js";

export type WebviewHtmlOptions = {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  nonce: string;
};

export { buildWebviewHtmlDocument } from "./webviewHtmlDocument.js";

/**
 * Strict CSP HTML shell that loads the bundled Webview entry.
 */
export function getWebviewHtml(options: WebviewHtmlOptions): string {
  const { webview, extensionUri, nonce } = options;
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", "main.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", "main.css"),
  );

  return buildWebviewHtmlDocument({
    cspSource: webview.cspSource,
    scriptSrc: scriptUri.toString(),
    styleSrc: styleUri.toString(),
    nonce,
  });
}
