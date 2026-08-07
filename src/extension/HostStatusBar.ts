/**
 * Status-bar host lifecycle badge. Extension Host only; no secrets.
 */

import * as vscode from "vscode";
import { hostStatusBarPresentation } from "../shared/hostStatusBar.js";
import type { HostStatusPayload } from "../shared/messages.js";

export class HostStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      49,
    );
    this.item.hide();
  }

  setStatus(status: HostStatusPayload): void {
    const view = hostStatusBarPresentation(status);
    this.item.text = view.text;
    this.item.tooltip = view.tooltip;
    this.item.command = view.command;
    this.item.backgroundColor = view.warning
      ? new vscode.ThemeColor("statusBarItem.errorBackground")
      : undefined;
    if (view.show) {
      this.item.show();
    } else {
      this.item.hide();
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
