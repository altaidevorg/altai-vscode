import * as vscode from "vscode";
import { registerCommands } from "./commands.js";
import { COMPATIBILITY } from "./compatibility.js";
import { HostManager } from "./host/HostManager.js";
import { getOutputChannel } from "./output.js";
import { AttentionStatusBar } from "./AttentionStatusBar.js";
import { HostStatusBar } from "./HostStatusBar.js";
import { AltaiViewProvider } from "./webview/AltaiViewProvider.js";
import { DiffContentProvider } from "./vscode/DiffContentProvider.js";
import { GitDiffAdapter } from "./vscode/GitDiffAdapter.js";
import { TerminalContextTracker } from "./vscode/TerminalContextTracker.js";
import { WorkspaceAdapter } from "./vscode/WorkspaceAdapter.js";
import {
  isWorkspaceTrusted,
  onDidGrantWorkspaceTrust,
} from "./workspaceTrust.js";
import { shouldNotifyHostRecovered } from "../shared/hostStatusNotify.js";
import {
  hostErrorActionCommands,
  hostRecoveredActionCommands,
  HOST_ERROR_ACTION_LABELS,
  shouldPromptHostErrorActions,
} from "../shared/hostErrorActions.js";
import {
  markFirstRunWalkthroughOffered,
  shouldOfferFirstRunWalkthrough,
} from "../shared/firstRunWalkthrough.js";
import type { HostStatusPayload } from "../shared/messages.js";

let hostManager: HostManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const output = getOutputChannel();
  output.appendLine(
    `[altai] activating extension v${context.extension.packageJSON.version as string}`,
  );

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  let provider: AltaiViewProvider | undefined;
  let lastHostStatus: HostStatusPayload["status"] | undefined;

  const attentionBar = new AttentionStatusBar();
  const hostStatusBar = new HostStatusBar();
  context.subscriptions.push(attentionBar, hostStatusBar);

  hostManager = new HostManager({
    extensionPath: context.extensionUri.fsPath,
    workspaceRoot,
    isTrusted: () => isWorkspaceTrusted(),
    onDidGrantTrust: (listener) => onDidGrantWorkspaceTrust(listener),
    extensionVersion: COMPATIBILITY.extension,
    log: (line) => output.appendLine(line),
    getAgentHostPathOverride: () => {
      const value = vscode.workspace
        .getConfiguration("altai")
        .get<string>("agentHostPath");
      return typeof value === "string" ? value : undefined;
    },
    onStatus: (status) => {
      hostStatusBar.setStatus(status);
      provider?.publishHostStatus(status);
      if (shouldPromptHostErrorActions(lastHostStatus, status.status)) {
        const commands = hostErrorActionCommands({
          ...(status.diagnosticCode
            ? { diagnosticCode: status.diagnosticCode }
            : {}),
        });
        const actions = commands.map(
          (command) => HOST_ERROR_ACTION_LABELS[command],
        );
        void vscode.window
          .showErrorMessage(
            status.message.trim() || "ALTAI agent host error",
            ...actions,
          )
          .then((choice) => {
            if (!choice) {
              return;
            }
            for (const command of commands) {
              if (HOST_ERROR_ACTION_LABELS[command] === choice) {
                void vscode.commands.executeCommand(command);
                return;
              }
            }
          });
      } else if (shouldNotifyHostRecovered(lastHostStatus, status.status)) {
        const recoverCommands = hostRecoveredActionCommands();
        const recoverActions = recoverCommands.map(
          (command) => HOST_ERROR_ACTION_LABELS[command],
        );
        void vscode.window
          .showInformationMessage(
            "ALTAI agent host is ready again.",
            ...recoverActions,
          )
          .then((choice) => {
            if (!choice) {
              return;
            }
            for (const command of recoverCommands) {
              if (HOST_ERROR_ACTION_LABELS[command] === choice) {
                void vscode.commands.executeCommand(command);
                return;
              }
            }
          });
      }
      lastHostStatus = status.status;
    },
  });

  const diffContentProvider = new DiffContentProvider(vscode);
  diffContentProvider.register(context);
  const gitDiffAdapter = new GitDiffAdapter(vscode);
  const terminalTracker = new TerminalContextTracker(vscode);
  context.subscriptions.push(terminalTracker);
  const workspaceAdapter = new WorkspaceAdapter(
    vscode,
    () => isWorkspaceTrusted(),
    (label, text) => diffContentProvider.createUri(label, text),
    () => gitDiffAdapter.getDiffContext(),
    terminalTracker,
    gitDiffAdapter,
  );
  provider = new AltaiViewProvider(
    context,
    hostManager,
    workspaceAdapter,
    (count) => attentionBar.setAttentionCount(count),
  );
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

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("altai.agentHostPath")) {
        return;
      }
      output.appendLine("[altai] altai.agentHostPath changed; restarting host");
      void hostManager?.restart();
    }),
  );

  void hostManager.start();
  void maybeOfferFirstRunWalkthrough(context);
}

async function maybeOfferFirstRunWalkthrough(
  context: vscode.ExtensionContext,
): Promise<void> {
  const openOnInstall = vscode.workspace
    .getConfiguration("altai")
    .get<boolean>("openWalkthroughOnInstall", true);
  if (
    !shouldOfferFirstRunWalkthrough(
      context.globalState,
      openOnInstall !== false,
    )
  ) {
    return;
  }
  await markFirstRunWalkthroughOffered(context.globalState);
  try {
    await vscode.commands.executeCommand("altai.openWalkthrough");
  } catch {
    // Walkthrough APIs can be unavailable in some hosts/tests; marker is set.
  }
}

export async function deactivate(): Promise<void> {
  if (hostManager) {
    await hostManager.shutdown();
    hostManager.dispose();
    hostManager = undefined;
  }
}
