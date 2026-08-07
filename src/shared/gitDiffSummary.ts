/**
 * Pure presentation of VS Code Git change lists (path/status only).
 * Shared by Extension Host GitDiffAdapter and Webview attach helpers.
 * Does not include file content and never spawns `git`.
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
