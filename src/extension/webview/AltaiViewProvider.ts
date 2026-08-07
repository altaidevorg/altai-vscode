import * as vscode from "vscode";
import * as path from "node:path";
import {
  buildOpenOperationsPayload,
} from "../../shared/operationsDeepLink.js";
import {
  buildOpenChatWithSelectionPayload,
  type OpenChatWithSelectionPayload,
} from "../../shared/selectionDeepLink.js";
import {
  buildOpenChatWithFilePayload,
  type OpenChatWithFilePayload,
} from "../../shared/fileDeepLink.js";
import {
  buildOpenSettingsPayload,
} from "../../shared/settingsDeepLink.js";
import { formatTerminalAttachText } from "../../shared/terminalAttach.js";
import {
  formatProblemsBundles,
  formatProblemsContextText,
} from "../../shared/problemsContext.js";
import {
  HOST_RPC_NOTIFICATION_EVENT,
  HOST_STATUS_EVENT,
  OPEN_CHAT_WITH_SELECTION_EVENT,
  OPEN_CHAT_WITH_FILE_EVENT,
  OPEN_OPERATIONS_EVENT,
  OPEN_SETTINGS_EVENT,
  type HostRequestParams,
  type HostStatusPayload,
  type OpenOperationsPayload,
  type OpenSettingsPayload,
  type OperationsDeepLinkView,
  type OperationsDeepLinkWorkHubView,
  type WorkspaceRequestParams,
} from "../../shared/messages.js";
import { createNonce } from "../../shared/nonce.js";
import { knownProviderLabel } from "../../shared/providerCatalog.js";
import {
  normalizeProviderBaseUrl,
  providerRequiresBaseUrl,
} from "../../shared/providerBaseUrl.js";
import type { HostManager } from "../host/HostManager.js";
import { getOutputChannel } from "../output.js";
import { WebviewBridge } from "./WebviewBridge.js";
import { getWebviewHtml } from "./webviewHtml.js";
import type { WorkspaceAdapter } from "../vscode/WorkspaceAdapter.js";
import { parseAttentionReportParams } from "../../shared/attention.js";
import { includeUriInWorkspaceProblemsAttach } from "../../shared/workspaceTrustAttach.js";

const MAX_RUN_ATTACHMENTS = 4;
const MAX_RUN_ATTACHMENT_BYTES = 1_500_000;
const MAX_RUN_ATTACHMENT_TOTAL_BYTES = 2_000_000;
const IMAGE_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export class AltaiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "altai.sidePanel";

  private view: vscode.WebviewView | undefined;
  private bridge: WebviewBridge | undefined;
  private removeNotificationListener: (() => void) | undefined;
  /** Queued until the Webview bridge is ready (first panel open). */
  private pendingOperationsOpen: OpenOperationsPayload | undefined;
  /** Queued until the Webview bridge is ready (first panel open). */
  private pendingSelectionAttach: OpenChatWithSelectionPayload | undefined;
  /** Queued until the Webview bridge is ready (first panel open). */
  private pendingFileAttach: OpenChatWithFilePayload | OpenChatWithFilePayload[] | undefined;
  /** Queued until the Webview bridge is ready (first panel open). */
  private pendingSettingsOpen: OpenSettingsPayload | undefined;
  private attentionCount = 0;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly hostManager: HostManager,
    private readonly workspaceAdapter: WorkspaceAdapter,
    private readonly onAttentionCountChange?: (count: number) => void,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.disposeBridge();
    this.view = webviewView;
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview"),
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
      ],
    };

    const nonce = createNonce();
    webview.html = getWebviewHtml({
      webview,
      extensionUri: this.context.extensionUri,
      nonce,
    });
    getOutputChannel().appendLine(
      `[altai] webview loaded from ${this.context.extensionUri.fsPath}`,
    );

    const bridge = new WebviewBridge(webview, {
      onInvalidMessage: () => {
        getOutputChannel().appendLine(
          "[altai] ignored invalid webview message",
        );
      },
      onUnhandledRequest: (method) => {
        getOutputChannel().appendLine(
          `[altai] unhandled webview request: ${method}`,
        );
      },
    });
    this.bridge = bridge;

    bridge.registerHandler("host.getStatus", () => this.getHostStatus());
    bridge.registerHandler("host.getCapabilities", () =>
      this.hostManager.getCapabilities(),
    );
    bridge.registerHandler("host.request", (params) =>
      this.proxyHostRequest(params),
    );
    bridge.registerHandler("workspace.request", (params) =>
      this.proxyWorkspaceRequest(params),
    );
    bridge.registerHandler("operations.reportAttention", (params) => {
      const count = parseAttentionReportParams(params);
      if (count === null) {
        throw Object.assign(new Error("invalid_attention_report"), {
          code: "invalid_params",
        });
      }
      this.attentionCount = count;
      this.onAttentionCountChange?.(count);
      return { count };
    });

    const onNotification = (notification: {
      method: string;
      params?: unknown;
    }): void => {
      const payload: { method: string; params?: unknown } = {
        method: notification.method,
      };
      if (notification.params !== undefined) {
        payload.params = notification.params;
      }
      bridge.postEvent(HOST_RPC_NOTIFICATION_EVENT, payload);
    };
    this.hostManager.on("notification", onNotification);
    this.removeNotificationListener = () => {
      this.hostManager.off("notification", onNotification);
    };

    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
      }
      if (this.bridge === bridge) {
        this.disposeBridge();
      }
    });

    bridge.postEvent(HOST_STATUS_EVENT, this.getHostStatus());
    if (this.pendingOperationsOpen) {
      bridge.postEvent(OPEN_OPERATIONS_EVENT, this.pendingOperationsOpen);
      this.pendingOperationsOpen = undefined;
    }
    if (this.pendingSelectionAttach) {
      bridge.postEvent(
        OPEN_CHAT_WITH_SELECTION_EVENT,
        this.pendingSelectionAttach,
      );
      this.pendingSelectionAttach = undefined;
    }
    if (this.pendingFileAttach) {
      const files = Array.isArray(this.pendingFileAttach)
        ? this.pendingFileAttach
        : [this.pendingFileAttach];
      for (const payload of files) {
        bridge.postEvent(OPEN_CHAT_WITH_FILE_EVENT, payload);
      }
      this.pendingFileAttach = undefined;
    }
    if (this.pendingSettingsOpen) {
      bridge.postEvent(OPEN_SETTINGS_EVENT, this.pendingSettingsOpen);
      this.pendingSettingsOpen = undefined;
    }
    getOutputChannel().appendLine("[altai] webview resolved");
  }

  publishHostStatus(status: HostStatusPayload): void {
    this.bridge?.postEvent(HOST_STATUS_EVENT, status);
  }

  /**
   * Focus the ALTAI side panel and open Operations on the requested route.
   */
  public async openOperations(input?: {
    view?: OperationsDeepLinkView;
    workHubView?: OperationsDeepLinkWorkHubView;
    composeTask?: boolean;
    composeAutomation?: boolean;
    draftTitle?: string;
  }): Promise<void> {
    const payload = buildOpenOperationsPayload({
      ...(input?.view !== undefined ? { view: input.view } : {}),
      ...(input?.workHubView !== undefined
        ? { workHubView: input.workHubView }
        : {}),
      ...(input?.composeTask ? { composeTask: true } : {}),
      ...(input?.composeAutomation ? { composeAutomation: true } : {}),
      ...(input?.draftTitle !== undefined && input.draftTitle.length > 0
        ? { draftTitle: input.draftTitle }
        : {}),
    });
    await vscode.commands.executeCommand("altai.sidePanel.focus");
    if (this.bridge && !this.bridge.isDisposed) {
      this.bridge.postEvent(OPEN_OPERATIONS_EVENT, payload);
      return;
    }
    this.pendingOperationsOpen = payload;
  }

  /**
   * Capture the active editor selection in Extension Host, open Chat, and
   * attach it as composer context. Empty selection surfaces a local message.
   */
  /**
   * Multi-root QuickPick → set Preferred host root (and git preference).
   */
  public async pickPreferredProjectRoot(): Promise<{
    name: string;
    uri: vscode.Uri;
  } | null> {
    const picked = (await this.workspaceAdapter.request(
      "pickWorkspaceFolder",
      {},
    )) as { uri?: string } | null;
    if (!picked?.uri) {
      return null;
    }
    await this.workspaceAdapter.request("setPreferredRootUri", {
      uri: picked.uri,
    });
    const name =
      vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(picked.uri))?.name ??
      path.basename(picked.uri);
    return { name, uri: vscode.Uri.parse(picked.uri) };
  }

  public async setPreferredProjectRoot(uri: vscode.Uri): Promise<void> {
    await this.workspaceAdapter.request("setPreferredRootUri", {
      uri: uri.toString(),
    });
  }

  /** Multi-root preferred host workspace path (fs), when set. */
  public getPreferredHostRootFsPath(): string | undefined {
    return this.workspaceAdapter.getPreferredHostRootFsPath();
  }

  /**
   * Context attach (Ask About *) requires a trusted workspace before host
   * materializes workspace bytes / attachments.
   */
  private async ensureTrustedForContextAttach(): Promise<boolean> {
    if (vscode.workspace.isTrusted) {
      return true;
    }
    const pick = await vscode.window.showWarningMessage(
      "This workspace is not trusted. Trust it before ALTAI can attach editor context.",
      "Manage Workspace Trust",
    );
    if (pick === "Manage Workspace Trust") {
      await vscode.commands.executeCommand(
        "workbench.action.manageWorkspaceTrust",
      );
    }
    return false;
  }

  public async openChatWithSelection(): Promise<void> {
    if (!(await this.ensureTrustedForContextAttach())) {
      return;
    }
    let selection: {
      uri: string;
      path: string;
      text: string;
    } | null;
    try {
      selection = (await this.workspaceAdapter.request("getSelection")) as {
        uri: string;
        path: string;
        text: string;
      } | null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "selection_unavailable";
      await vscode.window.showErrorMessage(
        `ALTAI could not read the editor selection: ${message}`,
      );
      return;
    }
    if (!selection || !selection.text.trim()) {
      await vscode.window.showInformationMessage(
        "Select code in a workspace file, then run ALTAI: Ask About Selection.",
      );
      return;
    }
    const payload = buildOpenChatWithSelectionPayload({
      uri: selection.uri,
      path: selection.path,
      text: selection.text,
    });
    if (!payload) {
      await vscode.window.showInformationMessage(
        "Select code in a workspace file, then run ALTAI: Ask About Selection.",
      );
      return;
    }
    await vscode.commands.executeCommand("altai.sidePanel.focus");
    if (this.bridge && !this.bridge.isDisposed) {
      this.bridge.postEvent(OPEN_CHAT_WITH_SELECTION_EVENT, payload);
      return;
    }
    this.pendingSelectionAttach = payload;
  }

  /**
   * Attach language diagnostics for a workspace file (or workspace-wide when no
   * resource) as selection-style context.
   */
  public async openChatWithProblems(resource?: vscode.Uri): Promise<void> {
    if (!(await this.ensureTrustedForContextAttach())) {
      return;
    }
    const target =
      resource ??
      vscode.window.activeTextEditor?.document.uri;

    let text: string | null = null;
    let payloadUri: string;
    let payloadPath: string;

    if (target && vscode.workspace.getWorkspaceFolder(target)) {
      const diagnostics = vscode.languages.getDiagnostics(target);
      const relative =
        vscode.workspace.asRelativePath(target, false) || target.fsPath;
      text = formatProblemsContextText(
        relative,
        diagnostics.map((d) => ({
          severity: d.severity as number,
          message: d.message,
          startLine: d.range.start.line,
          startCharacter: d.range.start.character,
          endLine: d.range.end.line,
          endCharacter: d.range.end.character,
          ...(d.source ? { source: d.source } : {}),
        })),
      );
      payloadUri = target.toString();
      payloadPath = target.fsPath;
      if (!text) {
        await vscode.window.showInformationMessage(
          "No Problems reported for this file.",
        );
        return;
      }
    } else if (!target) {
      const all = vscode.languages.getDiagnostics();
      const bundles = [];
      let primaryUri: vscode.Uri | undefined;
      const preferredFs =
        this.workspaceAdapter.getPreferredHostRootFsPath();
      const preferredFolder = preferredFs
        ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(preferredFs))
        : undefined;
      const preferredFolderUri = preferredFolder?.uri.toString();
      let skippedOutsidePreferred = false;
      for (const [uri, diagnostics] of all) {
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) {
          continue;
        }
        if (
          !includeUriInWorkspaceProblemsAttach({
            uriFolderUri: folder.uri.toString(),
            ...(preferredFolderUri
              ? { preferredFolderUri }
              : {}),
          })
        ) {
          if (diagnostics.length > 0) {
            skippedOutsidePreferred = true;
          }
          continue;
        }
        if (diagnostics.length === 0) {
          continue;
        }
        if (!primaryUri) {
          primaryUri = uri;
        }
        bundles.push({
          pathLabel:
            vscode.workspace.asRelativePath(uri, false) || uri.fsPath,
          diagnostics: diagnostics.map((d) => ({
            severity: d.severity as number,
            message: d.message,
            startLine: d.range.start.line,
            startCharacter: d.range.start.character,
            endLine: d.range.end.line,
            endCharacter: d.range.end.character,
            ...(d.source ? { source: d.source } : {}),
          })),
        });
      }
      text = formatProblemsBundles(bundles);
      if (!text || !primaryUri) {
        await vscode.window.showInformationMessage(
          skippedOutsidePreferred && preferredFolder
            ? `No Problems under preferred project root “${preferredFolder.name}”. Pick another root (ALTAI: Pick Project Root) or open a file with diagnostics.`
            : "No workspace Problems to attach. Open a file with diagnostics, or fix the workspace Issues list.",
        );
        return;
      }
      payloadUri = primaryUri.toString();
      payloadPath = primaryUri.fsPath;
    } else {
      await vscode.window.showInformationMessage(
        "ALTAI can only attach problems for files inside the workspace.",
      );
      return;
    }

    const payload = buildOpenChatWithSelectionPayload({
      uri: payloadUri,
      path: payloadPath,
      text,
    });
    if (!payload) {
      return;
    }
    await vscode.commands.executeCommand("altai.sidePanel.focus");
    if (this.bridge && !this.bridge.isDisposed) {
      this.bridge.postEvent(OPEN_CHAT_WITH_SELECTION_EVENT, payload);
      return;
    }
    this.pendingSelectionAttach = payload;
  }

  /**
   * Capture workspace file URI(s) (explorer multi-select or active editor), open Chat,
   * and attach as file chip(s) (contents stay on host until run/start).
   * Caps at MAX_RUN_ATTACHMENTS.
   */
  public async openChatWithActiveFile(
    resource?: vscode.Uri,
    selectedResources?: vscode.Uri[],
  ): Promise<void> {
    if (!(await this.ensureTrustedForContextAttach())) {
      return;
    }
    const candidates: vscode.Uri[] = [];
    if (Array.isArray(selectedResources) && selectedResources.length > 0) {
      candidates.push(...selectedResources);
    } else if (resource) {
      candidates.push(resource);
    }

    const files: { uri: string; path: string }[] = [];
    for (const candidate of candidates) {
      if (files.length >= MAX_RUN_ATTACHMENTS) {
        break;
      }
      const folder = vscode.workspace.getWorkspaceFolder(candidate);
      if (!folder) {
        continue;
      }
      try {
        const stat = await vscode.workspace.fs.stat(candidate);
        if (stat.type === vscode.FileType.File) {
          files.push({ uri: candidate.toString(), path: candidate.fsPath });
        }
      } catch {
        // skip unreadable entries
      }
    }

    if (files.length === 0) {
      let file: { uri: string; path: string } | null = null;
      try {
        file = (await this.workspaceAdapter.request("getActiveFile")) as {
          uri: string;
          path: string;
        } | null;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "active_file_unavailable";
        await vscode.window.showErrorMessage(
          `ALTAI could not read the active file: ${message}`,
        );
        return;
      }
      if (file) {
        files.push(file);
      }
    }

    if (files.length === 0) {
      await vscode.window.showInformationMessage(
        "Select workspace file(s) (not folders), then run ALTAI: Ask About Active File.",
      );
      return;
    }

    const payloads: OpenChatWithFilePayload[] = [];
    const baseKey = Date.now();
    for (const [index, file] of files.entries()) {
      const payload = buildOpenChatWithFilePayload({
        uri: file.uri,
        path: file.path,
        key: baseKey + index,
      });
      if (payload) {
        payloads.push(payload);
      }
    }
    if (payloads.length === 0) {
      await vscode.window.showInformationMessage(
        "Select a workspace file, then run ALTAI: Ask About Active File.",
      );
      return;
    }

    await vscode.commands.executeCommand("altai.sidePanel.focus");
    if (this.bridge && !this.bridge.isDisposed) {
      for (const payload of payloads) {
        this.bridge.postEvent(OPEN_CHAT_WITH_FILE_EVENT, payload);
      }
      return;
    }
    this.pendingFileAttach = payloads.length === 1 ? payloads[0]! : payloads;
  }

  /**
   * Attach presentation-only terminal context (selection, last command, or cwd)
   * as composer context using the selection deep-link path.
   */
  public async openChatWithTerminal(
    resource?: vscode.Terminal,
  ): Promise<void> {
    if (!(await this.ensureTrustedForContextAttach())) {
      return;
    }
    if (resource) {
      this.workspaceAdapter.setPreferredTerminal(resource);
    }
    let terminal: {
      cwd?: string;
      selectedText?: string;
      lastCommand?: string;
    } | null;
    try {
      terminal = (await this.workspaceAdapter.request("getTerminalContext")) as {
        cwd?: string;
        selectedText?: string;
        lastCommand?: string;
      } | null;
    } catch (error) {
      this.workspaceAdapter.setPreferredTerminal(undefined);
      const message =
        error instanceof Error ? error.message : "terminal_unavailable";
      await vscode.window.showErrorMessage(
        `ALTAI could not read the active terminal: ${message}`,
      );
      return;
    }
    this.workspaceAdapter.setPreferredTerminal(undefined);
    const text = formatTerminalAttachText({
      ...(terminal?.selectedText !== undefined
        ? { selectedText: terminal.selectedText }
        : {}),
      ...(terminal?.lastCommand !== undefined
        ? { lastCommand: terminal.lastCommand }
        : {}),
      ...(terminal?.cwd !== undefined ? { cwd: terminal.cwd } : {}),
    });
    if (!text) {
      await vscode.window.showInformationMessage(
        "Focus an integrated terminal with a cwd (or shell integration), then run ALTAI: Ask About Terminal.",
      );
      return;
    }
    const root =
      vscode.workspace.workspaceFolders?.[0]?.uri.toString() ??
      "file:///workspace";
    const pathLabel = terminal?.cwd?.trim()
      ? `terminal (${terminal.cwd.trim()})`
      : "terminal";
    const payload = buildOpenChatWithSelectionPayload({
      uri: root,
      path: pathLabel,
      text,
    });
    if (!payload) {
      await vscode.window.showInformationMessage(
        "Focus an integrated terminal, then run ALTAI: Ask About Terminal.",
      );
      return;
    }
    await vscode.commands.executeCommand("altai.sidePanel.focus");
    if (this.bridge && !this.bridge.isDisposed) {
      this.bridge.postEvent(OPEN_CHAT_WITH_SELECTION_EVENT, payload);
      return;
    }
    this.pendingSelectionAttach = payload;
  }

  /**
   * Attach a presentation-only working-tree summary (path/status list) as
   * composer context using the selection deep-link path.
   */
  public async openChatWithWorkingTree(
    resource?: vscode.Uri,
  ): Promise<void> {
    if (!(await this.ensureTrustedForContextAttach())) {
      return;
    }
    if (resource) {
      this.workspaceAdapter.setPreferredGitUri(resource);
    }
    let diff: {
      branch?: string;
      patch?: string;
      files?: readonly { path: string; status: string }[];
    } | null;
    try {
      diff = (await this.workspaceAdapter.request("getGitDiff")) as {
        branch?: string;
        patch?: string;
        files?: readonly { path: string; status: string }[];
      } | null;
    } catch (error) {
      this.workspaceAdapter.setPreferredGitUri(undefined);
      const message =
        error instanceof Error ? error.message : "git_diff_unavailable";
      await vscode.window.showErrorMessage(
        `ALTAI could not read working-tree changes: ${message}`,
      );
      return;
    }
    this.workspaceAdapter.setPreferredGitUri(undefined);
    const text = diff?.patch?.trim() ?? "";
    if (!text) {
      await vscode.window.showInformationMessage(
        "No git working-tree changes in this workspace, or the Git extension is unavailable.",
      );
      return;
    }
    const root =
      resource?.toString() ??
      vscode.workspace.workspaceFolders?.[0]?.uri.toString() ??
      "file:///workspace";
    const pathLabel = diff?.branch
      ? `working-tree (${diff.branch})`
      : "working-tree";
    const payload = buildOpenChatWithSelectionPayload({
      uri: root,
      path: pathLabel,
      text,
    });
    if (!payload) {
      await vscode.window.showInformationMessage(
        "No git working-tree changes in this workspace.",
      );
      return;
    }
    await vscode.commands.executeCommand("altai.sidePanel.focus");
    if (this.bridge && !this.bridge.isDisposed) {
      this.bridge.postEvent(OPEN_CHAT_WITH_SELECTION_EVENT, payload);
      return;
    }
    this.pendingSelectionAttach = payload;
  }

  /**
   * Focus the ALTAI side panel and open the Settings surface.
   */
  public async openSettings(): Promise<void> {
    const payload = buildOpenSettingsPayload();
    await vscode.commands.executeCommand("altai.sidePanel.focus");
    if (this.bridge && !this.bridge.isDisposed) {
      this.bridge.postEvent(OPEN_SETTINGS_EVENT, payload);
      return;
    }
    this.pendingSettingsOpen = payload;
  }

  private async proxyHostRequest(params: unknown): Promise<unknown> {
    const parsed = parseHostRequestParams(params);
    if (!parsed) {
      throw Object.assign(new Error("invalid_host_request_params"), {
        code: "invalid_params",
      });
    }
    if (parsed.method === "providers/connect") {
      const connection = parseProviderConnectionParams(parsed.params);
      if (!connection) {
        throw Object.assign(new Error("invalid_provider_connection"), {
          code: "invalid_params",
        });
      }
      return this.connectProvider(connection.providerId, connection.baseUrl);
    }
    const nativeParams = parsed.method === "run/start"
      ? await materializeRunAttachments(parsed.params)
      : parsed.params;
    return this.hostManager.request(parsed.method, nativeParams);
  }

  /** Open the native VS Code password prompt and send the result only to Rust. */
  public async connectProvider(
    providerId: string,
    baseUrl?: string,
  ): Promise<unknown> {
    const label = knownProviderLabel(providerId);
    let resolvedBaseUrl = baseUrl?.trim() || undefined;
    if (providerRequiresBaseUrl(providerId) && !resolvedBaseUrl) {
      const entered = await this.promptText({
        title: `ALTAI · ${label}`,
        prompt: "Base URL for OpenAI-compatible API (http or https)",
        placeHolder: "https://api.example.com/v1",
        password: false,
      });
      if (!entered) {
        throw Object.assign(new Error("provider_connection_cancelled"), {
          code: "cancelled",
        });
      }
      const normalized = normalizeProviderBaseUrl(entered);
      if (!normalized) {
        throw Object.assign(
          new Error("Invalid base URL (must be http:// or https://)"),
          { code: "invalid_params" },
        );
      }
      resolvedBaseUrl = normalized;
    } else if (resolvedBaseUrl) {
      const normalized = normalizeProviderBaseUrl(resolvedBaseUrl);
      if (!normalized) {
        throw Object.assign(
          new Error("Invalid base URL (must be http:// or https://)"),
          { code: "invalid_params" },
        );
      }
      resolvedBaseUrl = normalized;
    }

    const credential = await this.promptText({
      title: `ALTAI · ${label} API key`,
      prompt: `Paste your ${label} API key, then press Enter. The key is stored only on the agent host — not in this panel.`,
      placeHolder: "sk-…  (hidden while typing)",
      password: true,
    });
    if (!credential) {
      throw Object.assign(new Error("provider_connection_cancelled"), {
        code: "cancelled",
      });
    }
    // The password input belongs to the Extension Host, never the Webview.
    // The native response contains only configured state, never the key.
    return this.hostManager.request("providers/connect", {
      provider_id: providerId,
      credential: credential.trim(),
      ...(resolvedBaseUrl ? { base_url: resolvedBaseUrl } : {}),
    });
  }

  /**
   * Focused InputBox at the top of the editor window so the panel doesn’t
   * “swallow” attention when users try to enter a key from Settings.
   */
  private promptText(input: {
    title: string;
    prompt: string;
    placeHolder: string;
    password: boolean;
  }): Promise<string | undefined> {
    return new Promise((resolve) => {
      const box = vscode.window.createInputBox();
      box.title = input.title;
      box.prompt = input.prompt;
      box.placeholder = input.placeHolder;
      box.password = input.password;
      box.ignoreFocusOut = true;
      box.busy = false;
      let settled = false;
      const finish = (value: string | undefined) => {
        if (settled) {
          return;
        }
        settled = true;
        box.hide();
        box.dispose();
        resolve(value);
      };
      box.onDidAccept(() => {
        const value = box.value.trim();
        finish(value.length > 0 ? value : undefined);
      });
      box.onDidHide(() => {
        finish(undefined);
      });
      box.show();
    });
  }

  public async clearProviderCredential(providerId: string): Promise<unknown> {
    return this.hostManager.request("providers/clear", { provider_id: providerId });
  }

  private async proxyWorkspaceRequest(params: unknown): Promise<unknown> {
    const parsed = parseWorkspaceRequestParams(params);
    if (!parsed) {
      throw Object.assign(new Error("invalid_workspace_request_params"), {
        code: "invalid_params",
      });
    }
    return this.workspaceAdapter.request(parsed.method, parsed.params);
  }

  private getHostStatus(): HostStatusPayload {
    return this.hostManager.getStatus();
  }

  private disposeBridge(): void {
    this.removeNotificationListener?.();
    this.removeNotificationListener = undefined;
    this.bridge?.dispose();
    this.bridge = undefined;
  }
}

/**
 * Materialize only workspace-owned attachment URIs in the Extension Host.
 * The Webview sends identifiers, never bytes or filesystem paths to Rust;
 * the native protocol receives bounded base64 payloads after this validation.
 */
async function materializeRunAttachments(params: unknown): Promise<unknown> {
  if (!isRecord(params) || params.attachments === undefined) {
    return params;
  }
  if (!vscode.workspace.isTrusted) {
    throw new Error("workspace_not_trusted");
  }
  if (!Array.isArray(params.attachments) || params.attachments.length > MAX_RUN_ATTACHMENTS) {
    throw new Error("invalid_attachments");
  }
  if (params.attachments.length === 0) {
    const withoutAttachments = { ...params };
    delete withoutAttachments.attachments;
    return withoutAttachments;
  }
  let totalBytes = 0;
  const attachments = [];
  for (const value of params.attachments) {
    if (!isRecord(value) || typeof value.uri !== "string") {
      throw new Error("invalid_attachment");
    }
    let uri: vscode.Uri;
    try {
      uri = vscode.Uri.parse(value.uri, true);
    } catch {
      throw new Error("invalid_attachment_uri");
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder || !isWorkspaceDescendant(uri, workspaceFolder.uri)) {
      throw new Error("attachment_outside_workspace");
    }
    const mediaType = attachmentMediaType(uri, value.mimeType);
    if (!mediaType) {
      throw new Error("unsupported_attachment_media_type");
    }
    const stat = await vscode.workspace.fs.stat(uri);
    if (
      stat.type !== vscode.FileType.File ||
      (stat.type & vscode.FileType.SymbolicLink) !== 0 ||
      stat.size > MAX_RUN_ATTACHMENT_BYTES
    ) {
      throw new Error("attachment_too_large");
    }
    totalBytes += stat.size;
    if (totalBytes > MAX_RUN_ATTACHMENT_TOTAL_BYTES) {
      throw new Error("attachments_too_large");
    }
    const bytes = await vscode.workspace.fs.readFile(uri);
    if (!hasExpectedSignature(bytes, mediaType)) {
      throw new Error("invalid_attachment_content");
    }
    const data = Buffer.from(bytes).toString("base64");
    const name = vscode.workspace.asRelativePath(uri, false) || uri.path.split("/").pop() || "attachment";
    if (IMAGE_MEDIA_TYPES.has(mediaType)) {
      attachments.push({
        kind: "image",
        media_type: mediaType,
        data,
        name,
      });
    } else {
      attachments.push({
        kind: "document",
        media_type: mediaType,
        data,
        name,
      });
    }
  }
  return { ...params, attachments };
}

function isWorkspaceDescendant(uri: vscode.Uri, workspaceUri: vscode.Uri): boolean {
  if (uri.scheme !== workspaceUri.scheme || uri.authority !== workspaceUri.authority) {
    return false;
  }
  let root: string;
  let candidate: string;
  try {
    root = path.posix.normalize(decodeURIComponent(workspaceUri.path));
    candidate = path.posix.normalize(decodeURIComponent(uri.path));
  } catch {
    return false;
  }
  return candidate === root || candidate.startsWith(`${root.endsWith("/") ? root.slice(0, -1) : root}/`);
}

function hasExpectedSignature(bytes: Uint8Array, mediaType: string): boolean {
  if (mediaType === "image/png") {
    return matchesBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mediaType === "image/jpeg") {
    return matchesBytes(bytes, [0xff, 0xd8, 0xff]);
  }
  if (mediaType === "image/gif") {
    return matchesBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || matchesBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  }
  if (mediaType === "image/webp") {
    return matchesBytes(bytes, [0x52, 0x49, 0x46, 0x46]) && matchesBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  }
  return mediaType === "application/pdf" && matchesBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
}

function matchesBytes(bytes: Uint8Array, expected: number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function attachmentMediaType(uri: vscode.Uri, _requested: unknown): string | undefined {
  const path = uri.path.toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".pdf")) return "application/pdf";
  return undefined;
}

function parseWorkspaceRequestParams(
  value: unknown,
): WorkspaceRequestParams | undefined {
  return parseHostRequestParams(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHostRequestParams(value: unknown): HostRequestParams | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.method !== "string" || record.method.trim() === "") {
    return undefined;
  }
  const out: HostRequestParams = { method: record.method };
  if (Object.prototype.hasOwnProperty.call(record, "params")) {
    out.params = record.params;
  }
  return out;
}

export type ProviderConnectionParams = {
  providerId: string;
  baseUrl?: string;
};

/**
 * A Webview can request the native connection flow, but cannot submit its own
 * credential. Exact-field validation rejects secret-bearing payloads before
 * the Extension Host opens its password input.
 */
export function parseProviderConnectionParams(
  value: unknown,
): ProviderConnectionParams | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (!Object.keys(value).every((key) => key === "provider_id" || key === "base_url")) {
    return undefined;
  }
  const providerId = typeof value.provider_id === "string" ? value.provider_id.trim() : "";
  if (!/^[a-z0-9-]{1,64}$/.test(providerId)) {
    return undefined;
  }
  if (value.base_url === undefined) {
    return { providerId };
  }
  const baseUrl = normalizeProviderBaseUrl(value.base_url);
  if (!baseUrl) {
    return undefined;
  }
  return { providerId, baseUrl };
}
