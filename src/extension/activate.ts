import * as vscode from "vscode";
import { registerCommands } from "./commands.js";
import { AltaiViewProvider } from "./webview/AltaiViewProvider.js";
import { getOutputChannel } from "./output.js";

export function activate(context: vscode.ExtensionContext): void {
  const output = getOutputChannel();
  output.appendLine(
    `[altai] activating extension v${context.extension.packageJSON.version as string}`,
  );

  const provider = new AltaiViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AltaiViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  registerCommands(context, provider);
  output.appendLine("[altai] side panel provider registered");
}

export function deactivate(): void {
  // Host lifecycle shutdown lands in TASK-006.
}
