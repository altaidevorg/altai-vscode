/**
 * Extension Host terminal presentation context (no secrets, no stream capture).
 * Tracks last completed shell-integration commands per terminal handle.
 */

import type * as vscode from "vscode";

export class TerminalContextTracker implements vscode.Disposable {
  private readonly lastCommandByTerminal = new WeakMap<
    vscode.Terminal,
    string
  >();
  private preferred: vscode.Terminal | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly api: typeof vscode) {
    const endEvent = this.api.window.onDidEndTerminalShellExecution as
      | undefined
      | ((
          listener: (event: {
            terminal: vscode.Terminal;
            execution: { commandLine?: { value?: string } };
          }) => void,
        ) => vscode.Disposable);
    if (typeof endEvent === "function") {
      this.disposables.push(
        endEvent((event) => {
          const command = event.execution.commandLine?.value?.trim();
          if (command) {
            this.lastCommandByTerminal.set(event.terminal, command);
          }
        }),
      );
    }
  }

  /** Prefer a context-menu terminal for the next getTerminalContext call. */
  setPreferredTerminal(terminal: vscode.Terminal | undefined): void {
    this.preferred = terminal;
  }

  clearPreferredTerminal(): void {
    this.preferred = undefined;
  }

  getTerminal(): vscode.Terminal | undefined {
    return this.preferred ?? this.api.window.activeTerminal;
  }

  getLastCommand(terminal: vscode.Terminal): string | undefined {
    return this.lastCommandByTerminal.get(terminal);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.preferred = undefined;
  }
}
