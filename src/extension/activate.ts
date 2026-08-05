import * as vscode from "vscode";
import { registerCommands } from "./commands.js";
import { COMPATIBILITY } from "./compatibility.js";
import { HostManager } from "./host/HostManager.js";
import { getOutputChannel } from "./output.js";
import { AltaiViewProvider } from "./webview/AltaiViewProvider.js";
import { DiffContentProvider } from "./vscode/DiffContentProvider.js";
import { GitDiffAdapter } from "./vscode/GitDiffAdapter.js";
import { WorkspaceAdapter } from "./vscode/WorkspaceAdapter.js";
import {
  isWorkspaceTrusted,
  onDidGrantWorkspaceTrust,
} from "./workspaceTrust.js";

let hostManager: HostManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const output = getOutputChannel();
  output.appendLine(
    `[altai] activating extension v${context.extension.packageJSON.version as string}`,
  );

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  let provider: AltaiViewProvider | undefined;

  hostManager = new HostManager({
    extensionPath: context.extensionUri.fsPath,
    workspaceRoot,
    isTrusted: () => isWorkspaceTrusted(),
    onDidGrantTrust: (listener) => onDidGrantWorkspaceTrust(listener),
    extensionVersion: COMPATIBILITY.extension,
    log: (line) => output.appendLine(line),
    onStatus: (status) => {
      provider?.publishHostStatus(status);
    },
  });

  const diffContentProvider = new DiffContentProvider(vscode);
  diffContentProvider.register(context);
  const gitDiffAdapter = new GitDiffAdapter(vscode);
  const workspaceAdapter = new WorkspaceAdapter(
    vscode,
    () => isWorkspaceTrusted(),
    (label, text) => diffContentProvider.createUri(label, text),
    () => gitDiffAdapter.getDiffContext(),
  );
  provider = new AltaiViewProvider(context, hostManager, workspaceAdapter);
  // Persist presentation state via vscodeApi getState/setState (TASK-003).
  // Do not retain hidden Webview contexts.
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AltaiViewProvider.viewType, provider),
    {
      dispose: () => {
        void hostManager?.shutdown();
        hostManager?.dispose();
        hostManager = undefined;
      },
    },
  );

  registerCommands(context, provider, hostManager);
  output.appendLine("[altai] side panel provider registered");

  void hostManager.start();
}

export async function deactivate(): Promise<void> {
  if (hostManager) {
    await hostManager.shutdown();
    hostManager.dispose();
    hostManager = undefined;
  }
}
