import type {
  DiffInput,
  FileContent,
  FileContext,
  FileMatch,
  GitDiffContext,
  SelectionContext,
  TerminalContext,
  TextRange,
  WorkspaceInfo,
} from "@altai/host-contract" with { "resolution-mode": "import" };
import type * as vscode from "vscode";
import { isAltaiRecoveryCommand } from "../../shared/hostRecoveryCommands.js";
import { searchExcludeGlobFromSettings } from "../../shared/searchExcludeGlobs.js";
import { joinSelectionTexts } from "../../shared/selectionJoin.js";
import type { TerminalContextTracker } from "./TerminalContextTracker.js";
import type { GitDiffAdapter } from "./GitDiffAdapter.js";

const MAX_SEARCH_RESULTS = 100;
const MAX_QUERY_LENGTH = 256;
const MAX_FILE_BYTES = 1_000_000;
const MAX_SELECTION_CHARACTERS = 64_000;

export type WorkspaceRequestMethod =
  | "getWorkspace"
  | "getActiveFile"
  | "getSelection"
  | "searchFiles"
  | "readFile"
  | "openFile"
  | "openDiff"
  | "openExternal"
  | "revealInExplorer"
  | "pickWorkspaceFolder"
  | "getGitDiff"
  | "getTerminalContext"
  | "setPreferredRootUri"
  | "executeAltaiCommand";

export type ReviewUriFactory = (label: string, text: string) => vscode.Uri;

/**
 * VS Code-only workspace boundary. All file-system and editor operations stay
 * in the Extension Host; callers can only address URIs inside an open folder.
 */
export class WorkspaceAdapter {
  private preferredHostRootFsPath: string | undefined;

  constructor(
    private readonly api: typeof vscode,
    private readonly isTrusted: () => boolean,
    private readonly createReviewUri: ReviewUriFactory,
    private readonly getGitDiffContext: () => Promise<GitDiffContext | null>,
    private readonly terminalTracker?: TerminalContextTracker,
    private readonly gitDiffAdapter?: GitDiffAdapter,
    private readonly onPreferredHostRootChange?: (
      fsPath: string | undefined,
    ) => void,
    private readonly persistPreferredHostRootUri?: (
      uri: string | undefined,
    ) => void,
  ) {}

  /**
   * Preferred multi-root folder for native-host `--workspace` (project chip).
   * Falls back to undefined when the preferred folder was closed.
   */
  getPreferredHostRootFsPath(): string | undefined {
    if (!this.preferredHostRootFsPath) {
      return undefined;
    }
    const stillOpen = (this.api.workspace.workspaceFolders ?? []).some(
      (folder) => folder.uri.fsPath === this.preferredHostRootFsPath,
    );
    if (!stillOpen) {
      this.preferredHostRootFsPath = undefined;
      return undefined;
    }
    return this.preferredHostRootFsPath;
  }

  /**
   * Restore preferred root from workspaceState before the first host start.
   * Does not fire `onPreferredHostRootChange` (avoids thrash during activate).
   */
  restorePreferredHostRootUri(uriValue: string | undefined): void {
    if (!uriValue) {
      return;
    }
    let uri: vscode.Uri;
    try {
      uri = this.api.Uri.parse(uriValue);
    } catch {
      return;
    }
    const folder = this.api.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      return;
    }
    this.preferredHostRootFsPath = folder.uri.fsPath;
    this.setPreferredGitUri(folder.uri);
  }

  /** Prefer a right-clicked terminal for the next getTerminalContext. */
  setPreferredTerminal(terminal: vscode.Terminal | undefined): void {
    this.terminalTracker?.setPreferredTerminal(terminal);
  }

  /** Prefer explorer / resource URI for the next getGitDiff. */
  setPreferredGitUri(uri: vscode.Uri | undefined): void {
    this.gitDiffAdapter?.setPreferredTargetUri(uri);
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    // Recovery commands stay available when the workspace is untrusted so the
    // wait shell can open logs / diagnostics / restart without editor FS access.
    if ((method as WorkspaceRequestMethod) === "executeAltaiCommand") {
      return this.executeAltaiCommand(readAltaiCommandId(params));
    }
    this.assertTrusted();
    switch (method as WorkspaceRequestMethod) {
      case "getWorkspace":
        return this.getWorkspace();
      case "getActiveFile":
        return this.getActiveFile();
      case "getSelection":
        return this.getSelection();
      case "searchFiles":
        return this.searchFiles(readQuery(params));
      case "readFile":
        return this.readFile(readUri(params));
      case "openFile":
        return this.openFile(readUri(params), readRange(params));
      case "openDiff":
        return this.openDiff(readDiffInput(params));
      case "openExternal":
        return this.openExternal(readExternalHref(params));
      case "revealInExplorer":
        return this.revealInExplorer(readUri(params));
      case "pickWorkspaceFolder":
        return this.pickWorkspaceFolder();
      case "getGitDiff":
        return this.getGitDiffContext();
      case "getTerminalContext":
        return this.getTerminalContext();
      case "setPreferredRootUri":
        return this.setPreferredRootUri(readOptionalUri(params));
      default:
        throw codedError("method_not_found", `Unknown workspace method: ${method}`);
    }
  }

  /**
   * Multi-root project chip: prefer this workspace folder for getGitDiff and
   * native-host `--workspace` until Explorer/SCM or another pick overrides.
   */
  private setPreferredRootUri(
    uriValue: string | undefined,
  ): { ok: true } {
    if (!uriValue) {
      this.setPreferredGitUri(undefined);
      this.updatePreferredHostRoot(undefined, undefined);
      return { ok: true };
    }
    const uri = this.parseWorkspaceUri(uriValue);
    const folder = this.api.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      throw codedError(
        "invalid_uri",
        "Preferred root must be an open workspace folder",
      );
    }
    this.setPreferredGitUri(folder.uri);
    this.updatePreferredHostRoot(folder.uri.fsPath, folder.uri.toString());
    return { ok: true };
  }

  private updatePreferredHostRoot(
    fsPath: string | undefined,
    preferredUri: string | undefined,
  ): void {
    this.persistPreferredHostRootUri?.(preferredUri);
    if (this.preferredHostRootFsPath === fsPath) {
      return;
    }
    this.preferredHostRootFsPath = fsPath;
    this.onPreferredHostRootChange?.(fsPath);
  }

  private async executeAltaiCommand(command: string): Promise<{ ok: true }> {
    if (!isAltaiRecoveryCommand(command)) {
      throw codedError(
        "command_not_allowed",
        `ALTAI command is not allowlisted: ${command}`,
      );
    }
    await this.api.commands.executeCommand(command);
    return { ok: true };
  }

  private getWorkspace(): WorkspaceInfo {
    const roots = (this.api.workspace.workspaceFolders ?? []).map((folder) =>
      folder.uri.toString(),
    );
    const currentDir =
      this.getPreferredHostRootFsPath() ??
      this.api.workspace.workspaceFolders?.[0]?.uri.fsPath;
    return {
      roots,
      trusted: this.api.workspace.isTrusted,
      ...(currentDir ? { currentDir } : {}),
    };
  }

  private getActiveFile(): FileContext | null {
    const editor = this.api.window.activeTextEditor;
    if (!editor || !this.isWorkspaceUri(editor.document.uri)) {
      return null;
    }
    return fileContext(editor.document);
  }

  private getSelection(): SelectionContext | null {
    const editor = this.api.window.activeTextEditor;
    if (!editor || !this.isWorkspaceUri(editor.document.uri)) {
      return null;
    }
    const selections = (editor.selections ?? [editor.selection]).map(
      (selection) => ({
        startLine: selection.start.line,
        startCharacter: selection.start.character,
        endLine: selection.end.line,
        endCharacter: selection.end.character,
        text: editor.document.getText(selection),
      }),
    );
    const joined = joinSelectionTexts(selections);
    if (!joined) {
      return null;
    }
    if (joined.text.length > MAX_SELECTION_CHARACTERS) {
      throw codedError(
        "selection_too_large",
        `Selection exceeds the ${MAX_SELECTION_CHARACTERS}-character limit`,
      );
    }
    return {
      ...fileContext(editor.document),
      range: joined.range,
      text: joined.text,
    };
  }

  private async searchFiles(query: string): Promise<FileMatch[]> {
    if (query.length === 0 || query.length > MAX_QUERY_LENGTH) {
      throw codedError(
        "invalid_query",
        `Search query must be between 1 and ${MAX_QUERY_LENGTH} characters`,
      );
    }
    const filesExclude = this.api.workspace
      .getConfiguration("files")
      .get<Record<string, unknown>>("exclude");
    const searchExclude = this.api.workspace
      .getConfiguration("search")
      .get<Record<string, unknown>>("exclude");
    const exclude = searchExcludeGlobFromSettings({
      ...(filesExclude ? { filesExclude } : {}),
      ...(searchExclude ? { searchExclude } : {}),
    });
    const candidates = await this.api.workspace.findFiles(
      `**/*${escapeGlob(query)}*`,
      exclude,
      MAX_SEARCH_RESULTS,
    );
    return candidates
      .map((uri) => ({ uri: uri.toString(), path: uri.fsPath }));
  }

  private async readFile(uriValue: string): Promise<FileContent> {
    const uri = this.parseWorkspaceUri(uriValue);
    const stat = await this.api.workspace.fs.stat(uri);
    if (stat.size > MAX_FILE_BYTES) {
      throw codedError(
        "file_too_large",
        `File exceeds the ${MAX_FILE_BYTES}-byte context limit`,
      );
    }
    const bytes = await this.api.workspace.fs.readFile(uri);
    if (bytes.includes(0)) {
      throw codedError("binary_file", "Binary files cannot be added as context");
    }
    return {
      uri: uri.toString(),
      path: uri.fsPath,
      text: Buffer.from(bytes).toString("utf8"),
      truncated: false,
    };
  }

  private async openFile(uriValue: string, range?: TextRange): Promise<void> {
    const uri = this.parseWorkspaceUri(uriValue);
    const document = await this.api.workspace.openTextDocument(uri);
    const editor = await this.api.window.showTextDocument(document, { preview: true });
    if (range) {
      const selection = new this.api.Selection(
        range.startLine,
        range.startCharacter,
        range.endLine,
        range.endCharacter,
      );
      editor.selection = selection;
      editor.revealRange(selection, this.api.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }

  private async openDiff(input: DiffInput): Promise<void> {
    const title = input.title ?? input.path ?? "ALTAI Review";
    const original = input.originalUri
      ? this.parseWorkspaceUri(input.originalUri)
      : input.originalText !== undefined
        ? this.createReviewUri(`${title}-original`, input.originalText)
        : undefined;
    const modified = input.modifiedUri
      ? this.parseWorkspaceUri(input.modifiedUri)
      : input.modifiedText !== undefined
        ? this.createReviewUri(`${title}-modified`, input.modifiedText)
        : undefined;
    if (!original || !modified) {
      throw codedError(
        "invalid_diff",
        "A diff requires both original and modified content or workspace URIs",
      );
    }
    await this.api.commands.executeCommand("vscode.diff", original, modified, title);
  }

  private async openExternal(href: string): Promise<void> {
    let uri: vscode.Uri;
    try {
      uri = this.api.Uri.parse(href, true);
    } catch {
      throw codedError("invalid_uri", "Invalid external URL");
    }
    const scheme = (uri.scheme || schemeFromHref(href)).toLowerCase();
    if (scheme !== "http" && scheme !== "https" && scheme !== "mailto") {
      throw codedError(
        "unsupported_scheme",
        "Only http(s) and mailto links can be opened externally",
      );
    }
    await this.api.env.openExternal(uri);
  }

  /**
   * Focus the Explorer and highlight a workspace root or resource.
   * Used by the project-target chip (not a multi-project switcher).
   */
  private async revealInExplorer(uriValue: string): Promise<void> {
    const uri = this.parseWorkspaceUri(uriValue);
    await this.api.commands.executeCommand("revealInExplorer", uri);
  }

  /**
   * Multi-root folder picker. Returns `{ uri }` or `null` when dismissed.
   * Single-folder workspaces return that folder without showing a UI.
   */
  private async pickWorkspaceFolder(): Promise<{ uri: string } | null> {
    const folders = this.api.workspace.workspaceFolders ?? [];
    if (folders.length === 0) {
      return null;
    }
    if (folders.length === 1) {
      return { uri: folders[0]!.uri.toString() };
    }
    const items = folders.map((folder) => ({
      label: folder.name,
      description: folder.uri.fsPath,
      uri: folder.uri.toString(),
    }));
    const choice = await this.api.window.showQuickPick(items, {
      title: "ALTAI project folder",
      placeHolder: "Select the workspace root for agent context",
      matchOnDescription: true,
    });
    if (!choice) {
      return null;
    }
    return { uri: choice.uri };
  }

  private getTerminalContext(): TerminalContext | null {
    const terminal =
      this.terminalTracker?.getTerminal() ?? this.api.window.activeTerminal;
    if (!terminal) {
      return null;
    }
    const lastCommand = this.terminalTracker?.getLastCommand(terminal);
    const creationOptions = terminal.creationOptions;
    const configuredCwd =
      "cwd" in creationOptions ? creationOptions.cwd : undefined;
    const cwd = terminal.shellIntegration?.cwd ?? configuredCwd;
    if (cwd) {
      return {
        cwd: typeof cwd === "string" ? cwd : cwd.toString(),
        ...(lastCommand ? { lastCommand } : {}),
      };
    }
    if (lastCommand) {
      return { lastCommand };
    }
    // Fallback when shellIntegration has not reported a cwd yet: still attach
    // a presentation-only label so Attach Terminal / Ask About Terminal work.
    const name = typeof terminal.name === "string" ? terminal.name.trim() : "";
    if (!name) {
      return null;
    }
    return {
      lastCommand: `Active terminal: ${name}`,
    };
  }

  private parseWorkspaceUri(value: string): vscode.Uri {
    let uri: vscode.Uri;
    try {
      uri = this.api.Uri.parse(value, true);
    } catch {
      throw codedError("invalid_uri", "Invalid workspace URI");
    }
    if (!this.isWorkspaceUri(uri)) {
      throw codedError("outside_workspace", "URI must belong to an open workspace folder");
    }
    return uri;
  }

  private isWorkspaceUri(uri: vscode.Uri): boolean {
    return this.api.workspace.getWorkspaceFolder(uri) !== undefined;
  }

  private assertTrusted(): void {
    if (!this.isTrusted()) {
      throw codedError("workspace_untrusted", "Workspace must be trusted for editor context");
    }
  }
}

function fileContext(document: vscode.TextDocument): FileContext {
  return {
    uri: document.uri.toString(),
    path: document.uri.fsPath,
    languageId: document.languageId,
  };
}

function toTextRange(selection: vscode.Selection): TextRange {
  return {
    startLine: selection.start.line,
    startCharacter: selection.start.character,
    endLine: selection.end.line,
    endCharacter: selection.end.character,
  };
}

function readQuery(value: unknown): string {
  if (!isRecord(value) || typeof value.query !== "string") {
    throw codedError("invalid_params", "searchFiles requires a query string");
  }
  return value.query.trim();
}

function readAltaiCommandId(value: unknown): string {
  if (!isRecord(value) || typeof value.command !== "string") {
    throw codedError(
      "invalid_params",
      "executeAltaiCommand requires a command string",
    );
  }
  const command = value.command.trim();
  if (!command) {
    throw codedError("invalid_params", "command must be non-empty");
  }
  return command;
}

function readUri(value: unknown): string {
  if (!isRecord(value) || typeof value.uri !== "string") {
    throw codedError("invalid_params", "A workspace URI is required");
  }
  return value.uri;
}

/** Clears preferred root when `uri` is missing/empty; otherwise returns the string. */
function readOptionalUri(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw codedError(
      "invalid_params",
      "setPreferredRootUri requires an object params payload",
    );
  }
  if (value.uri === undefined || value.uri === null || value.uri === "") {
    return undefined;
  }
  if (typeof value.uri !== "string") {
    throw codedError("invalid_params", "uri must be a string when provided");
  }
  return value.uri;
}

function readRange(value: unknown): TextRange | undefined {
  if (!isRecord(value) || value.range === undefined) {
    return undefined;
  }
  const range = value.range;
  if (!isRecord(range)) {
    throw codedError("invalid_params", "Range must be an object");
  }
  const keys = ["startLine", "startCharacter", "endLine", "endCharacter"] as const;
  if (!keys.every((key) => Number.isInteger(range[key]) && (range[key] as number) >= 0)) {
    throw codedError("invalid_params", "Range values must be non-negative integers");
  }
  return {
    startLine: range.startLine as number,
    startCharacter: range.startCharacter as number,
    endLine: range.endLine as number,
    endCharacter: range.endCharacter as number,
  };
}

function readDiffInput(value: unknown): DiffInput {
  if (!isRecord(value)) {
    throw codedError("invalid_params", "openDiff requires a diff input");
  }
  const input: DiffInput = {};
  for (const key of [
    "title",
    "originalUri",
    "modifiedUri",
    "originalText",
    "modifiedText",
    "path",
  ] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "string") {
        throw codedError("invalid_params", `${key} must be a string`);
      }
      input[key] = value[key];
    }
  }
  return input;
}

function readExternalHref(value: unknown): string {
  if (!isRecord(value) || typeof value.href !== "string") {
    throw codedError("invalid_params", "openExternal requires an href string");
  }
  const href = value.href.trim();
  if (!href) {
    throw codedError("invalid_params", "openExternal requires a non-empty href");
  }
  return href;
}

function schemeFromHref(href: string): string {
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(href);
  return match?.[1] ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeGlob(value: string): string {
  return value.replace(/[\[\]{}*?]/g, (character) => {
    if (character === "[") {
      return "[[]";
    }
    if (character === "]") {
      return "[]]";
    }
    return `[${character}]`;
  });
}

function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}
