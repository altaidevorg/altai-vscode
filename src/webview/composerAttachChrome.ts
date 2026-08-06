/**
 * Pure helpers: turn VS Code Git state into attachable presentation text.
 * Does not include file content or spawn `git`; status paths only.
 */

export type GitDiffFileLine = {
  path: string;
  status: string;
};

export function formatGitDiffSummary(input: {
  branch?: string;
  files: readonly GitDiffFileLine[];
}): string | null {
  if (input.files.length === 0) {
    return null;
  }
  const head = input.branch?.trim()
    ? `Working tree changes on ${input.branch.trim()}`
    : "Working tree changes";
  const lines = input.files
    .map((file) => {
      const path = file.path.trim();
      const status = file.status.trim();
      if (!path) {
        return null;
      }
      return status ? `- ${status}  ${path}` : `- ${path}`;
    })
    .filter((line): line is string => Boolean(line));
  if (lines.length === 0) {
    return null;
  }
  return [`${head}:`, ...lines].join("\n");
}

/**
 * Build terminal context attach text when VS Code may only expose cwd.
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
