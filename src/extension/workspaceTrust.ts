import * as vscode from "vscode";

/**
 * Native host must not start until the workspace is trusted (TASK-006).
 */
export function isWorkspaceTrusted(): boolean {
  return vscode.workspace.isTrusted;
}

export function onDidGrantWorkspaceTrust(
  listener: () => void,
): vscode.Disposable {
  return vscode.workspace.onDidGrantWorkspaceTrust(listener);
}
