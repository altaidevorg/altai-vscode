import * as fs from "node:fs";
import * as vscode from "vscode";
import { withAssetCacheBust } from "../../shared/assetCacheBust.js";
import { buildWebviewHtmlDocument } from "./webviewHtmlDocument.js";

export type WebviewHtmlOptions = {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  nonce: string;
};

export { buildWebviewHtmlDocument } from "./webviewHtmlDocument.js";

function fileMtimeBust(fsPath: string): string {
  try {
    return String(Math.trunc(fs.statSync(fsPath).mtimeMs));
  } catch {
    return "0";
  }
}

/**
 * Strict CSP HTML shell that loads the bundled Webview entry.
 */
export function getWebviewHtml(options: WebviewHtmlOptions): string {
  const { webview, extensionUri, nonce } = options;
  const scriptPath = vscode.Uri.joinPath(
    extensionUri,
    "dist",
    "webview",
    "main.js",
  );
  const stylePath = vscode.Uri.joinPath(
    extensionUri,
    "dist",
    "webview",
    "main.css",
  );
  const scriptUri = webview.asWebviewUri(scriptPath);
  const styleUri = webview.asWebviewUri(stylePath);
  const bust = fileMtimeBust(scriptPath.fsPath);

  return buildWebviewHtmlDocument({
    cspSource: webview.cspSource,
    scriptSrc: withAssetCacheBust(scriptUri.toString(), bust),
    styleSrc: withAssetCacheBust(styleUri.toString(), bust),
    nonce,
  });
}
