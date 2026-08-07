/**
 * Status-bar attention badge for Operations. Extension Host only; no secrets.
 */

import * as vscode from "vscode";
import { attentionStatusBarCommand } from "../shared/attention.js";

export class AttentionStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private count = 0;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.render();
    this.item.show();
  }

  setAttentionCount(count: number): void {
    const next = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    if (next === this.count) {
      return;
    }
    this.count = next;
    this.render();
  }

  dispose(): void {
    this.item.dispose();
  }

  private render(): void {
    this.item.command = attentionStatusBarCommand(this.count);
    if (this.count > 0) {
      const label = this.count > 99 ? "99+" : String(this.count);
      this.item.text = `$(bell) ALTAI ${label}`;
      this.item.tooltip = `${this.count} ALTAI item(s) need attention — open Inbox`;
      this.item.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    } else {
      this.item.text = "$(robot) ALTAI";
      this.item.tooltip = "Open ALTAI Operations";
      this.item.backgroundColor = undefined;
    }
  }
}
