/**
 * Pure helper: turn terminal context into attachable presentation text.
 * Extension Host and Webview share this so Attach Terminal and Ask About
 * Terminal stay consistent. No vscode / React imports.
 */

export function formatTerminalAttachText(input: {
  selectedText?: string | null;
  lastCommand?: string | null;
  cwd?: string | null;
}): string | null {
  const selection = input.selectedText?.trim();
  if (selection) {
    return selection;
  }
  const command = input.lastCommand?.trim();
  if (command) {
    return command;
  }
  const cwd = input.cwd?.trim();
  if (cwd) {
    return `Active terminal cwd: ${cwd}`;
  }
  return null;
}
