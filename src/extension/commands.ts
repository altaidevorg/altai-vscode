import * as vscode from "vscode";
import type { AltaiViewProvider } from "./webview/AltaiViewProvider.js";
import { getOutputChannel } from "./output.js";
import { COMPATIBILITY } from "./compatibility.js";
import type { HostManager } from "./host/HostManager.js";
import { isWorkspaceTrusted } from "./workspaceTrust.js";

export function registerCommands(
  context: vscode.ExtensionContext,
  provider: AltaiViewProvider,
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
    vscode.commands.registerCommand("altai.connectProvider", async () => {
      const selected = await vscode.window.showQuickPick(PROVIDERS, {
        placeHolder: "Select an AI provider to connect",
      });
      if (!selected) return;
      try {
        await provider.connectProvider(selected.id);
        await vscode.window.showInformationMessage(`${selected.label} is connected to ALTAI.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "provider_connection_failed";
        if (message !== "provider_connection_cancelled") {
          await vscode.window.showErrorMessage(`ALTAI could not connect ${selected.label}: ${message}`);
        }
      }
    }),
    vscode.commands.registerCommand("altai.clearProviderCredential", async () => {
      const selected = await vscode.window.showQuickPick(PROVIDERS, {
        placeHolder: "Select an AI provider credential to remove",
      });
      if (!selected) return;
      const confirmed = await vscode.window.showWarningMessage(
        `Remove ALTAI's stored credential for ${selected.label}?`,
        { modal: true },
        "Remove credential",
      );
      if (confirmed !== "Remove credential") return;
      try {
        await provider.clearProviderCredential(selected.id);
        await vscode.window.showInformationMessage(`${selected.label} credential removed from ALTAI.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "provider_clear_failed";
        await vscode.window.showErrorMessage(`ALTAI could not remove ${selected.label}: ${message}`);
      }
    }),
  );
}

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
  { id: "xai", label: "xAI" },
  { id: "groq", label: "Groq" },
  { id: "mistral", label: "Mistral" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai-compatible", label: "OpenAI Compatible" },
] as const;
