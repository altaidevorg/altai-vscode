import * as vscode from "vscode";
import type { AltaiViewProvider } from "./webview/AltaiViewProvider.js";
import { getOutputChannel } from "./output.js";
import { COMPATIBILITY } from "./compatibility.js";
import {
  formatCompatibilitySummary,
  formatDiagnosticsReport,
} from "./diagnosticsReport.js";
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
    vscode.commands.registerCommand("altai.askAboutSelection", async () => {
      await provider.openChatWithSelection();
    }),
    vscode.commands.registerCommand("altai.askAboutActiveFile", async () => {
      await provider.openChatWithActiveFile();
    }),
    vscode.commands.registerCommand("altai.askAboutWorkingTree", async () => {
      await provider.openChatWithWorkingTree();
    }),
    vscode.commands.registerCommand("altai.openOperations", async () => {
      await provider.openOperations({ view: "overview" });
    }),
    vscode.commands.registerCommand("altai.openOperationsWork", async () => {
      await provider.openOperations({ view: "work", workHubView: "runs" });
    }),
    vscode.commands.registerCommand("altai.openOperationsRuns", async () => {
      await provider.openOperations({ view: "runs" });
    }),
    vscode.commands.registerCommand("altai.openOperationsNewTask", async () => {
      await provider.openOperations({
        view: "runs",
        workHubView: "runs",
        composeTask: true,
      });
    }),
    vscode.commands.registerCommand(
      "altai.openOperationsNewAutomation",
      async () => {
        await provider.openOperations({
          view: "work",
          workHubView: "scheduled",
          composeAutomation: true,
        });
      },
    ),
    vscode.commands.registerCommand("altai.openOperationsInbox", async () => {
      await provider.openOperations({ view: "inbox" });
    }),
    vscode.commands.registerCommand(
      "altai.openOperationsScheduled",
      async () => {
        await provider.openOperations({
          view: "work",
          workHubView: "scheduled",
        });
      },
    ),
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
      const status = hostManager.getStatus();
      const lines = formatDiagnosticsReport({
        compatibility: COMPATIBILITY,
        env: {
          workspaceTrusted: isWorkspaceTrusted(),
          remoteName: vscode.env.remoteName,
          appHost: vscode.env.appHost,
          uiKind: vscode.env.uiKind,
          extensionPath: context.extensionUri.fsPath,
        },
        host: {
          lifecycle: hostManager.getLifecycleState(),
          resolvedPath: hostManager.getResolvedPath(),
          status: status.status,
          message: status.message,
          diagnostic: hostManager.getLastDiagnostic(),
        },
      });
      for (const line of lines) {
        channel.appendLine(line);
      }
      // Surface native host pin for alpha supportability.
      try {
        const pinUri = vscode.Uri.joinPath(
          context.extensionUri,
          "resources",
          "native",
          "PIN.json",
        );
        const pinBytes = await vscode.workspace.fs.readFile(pinUri);
        const pinText = Buffer.from(pinBytes).toString("utf8");
        channel.appendLine("  hostPin=" + pinText.replace(/\s+/g, " ").trim());
      } catch {
        channel.appendLine("  hostPin=(missing)");
      }
      const recovery = lines.find((line) => line.startsWith("  recovery="));
      const summary = recovery
        ? recovery.slice("  recovery=".length)
        : "Diagnostics written to the ALTAI output channel.";
      await vscode.window.showInformationMessage(
        summary.length > 160 ? `${summary.slice(0, 157)}…` : summary,
      );
    }),
    vscode.commands.registerCommand("altai.showVersionCompatibility", async () => {
      await vscode.window.showInformationMessage(
        formatCompatibilitySummary(COMPATIBILITY),
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
