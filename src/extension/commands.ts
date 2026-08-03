import * as vscode from "vscode";
import type { AltaiViewProvider } from "./webview/AltaiViewProvider.js";
import { getOutputChannel } from "./output.js";
import { COMPATIBILITY } from "./compatibility.js";
import type { HostManager } from "./host/HostManager.js";
import { isWorkspaceTrusted } from "./workspaceTrust.js";

export function registerCommands(
  context: vscode.ExtensionContext,
  _provider: AltaiViewProvider,
  hostManager: HostManager,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("altai.openSidePanel", async () => {
      await vscode.commands.executeCommand("altai.sidePanel.focus");
    }),
    vscode.commands.registerCommand("altai.openLogs", () => {
      getOutputChannel().show(true);
    }),
    vscode.commands.registerCommand("altai.restartAgentHost", async () => {
      const channel = getOutputChannel();
      channel.appendLine("[altai] restart requested");
      await hostManager.restart();
      const status = hostManager.getStatus();
      await vscode.window.showInformationMessage(
        `ALTAI host: ${status.status} — ${status.message}`,
      );
    }),
    vscode.commands.registerCommand("altai.runDiagnostics", async () => {
      const channel = getOutputChannel();
      channel.show(true);
      const diagnostic = hostManager.getLastDiagnostic();
      channel.appendLine("[altai] diagnostics");
      channel.appendLine(`  extension=${COMPATIBILITY.extension}`);
      channel.appendLine(`  agentUi=${COMPATIBILITY.agentUi}`);
      channel.appendLine(`  protocol=${COMPATIBILITY.protocol}`);
      channel.appendLine(`  agentHost=${COMPATIBILITY.agentHost}`);
      channel.appendLine(
        `  workspaceTrusted=${isWorkspaceTrusted() ? "yes" : "no"}`,
      );
      channel.appendLine(
        `  resolvedPath=${hostManager.getResolvedPath() ?? "(none)"}`,
      );
      channel.appendLine(`  lifecycle=${hostManager.getLifecycleState()}`);
      channel.appendLine(
        `  diagnosticCode=${diagnostic?.code ?? "(none)"}`,
      );
      channel.appendLine(`  hostStatus=${hostManager.getStatus().status}`);
      channel.appendLine(`  hostMessage=${hostManager.getStatus().message}`);
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
