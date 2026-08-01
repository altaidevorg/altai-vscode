import * as vscode from "vscode";
import type { AltaiViewProvider } from "./webview/AltaiViewProvider.js";
import { getOutputChannel } from "./output.js";
import { COMPATIBILITY } from "./compatibility.js";

export function registerCommands(
  context: vscode.ExtensionContext,
  _provider: AltaiViewProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("altai.openSidePanel", async () => {
      await vscode.commands.executeCommand("altai.sidePanel.focus");
    }),
    vscode.commands.registerCommand("altai.openLogs", () => {
      getOutputChannel().show(true);
    }),
    vscode.commands.registerCommand("altai.runDiagnostics", async () => {
      const channel = getOutputChannel();
      channel.show(true);
      channel.appendLine("[altai] diagnostics (foundation)");
      channel.appendLine(`  extension=${COMPATIBILITY.extension}`);
      channel.appendLine(`  agentUi=${COMPATIBILITY.agentUi}`);
      channel.appendLine(`  protocol=${COMPATIBILITY.protocol}`);
      channel.appendLine(`  agentHost=${COMPATIBILITY.agentHost}`);
      channel.appendLine("  host=not connected (TASK-006)");
      await vscode.window.showInformationMessage(
        "ALTAI diagnostics written to the ALTAI output channel.",
      );
    }),
    vscode.commands.registerCommand("altai.showVersionCompatibility", async () => {
      await vscode.window.showInformationMessage(
        `ALTAI ${COMPATIBILITY.extension} · UI ${COMPATIBILITY.agentUi} · protocol ${COMPATIBILITY.protocol} · host ${COMPATIBILITY.agentHost}`,
      );
    }),
  );
}
