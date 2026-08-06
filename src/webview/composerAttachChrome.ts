/**
 * Pure helpers: turn VS Code Git state into attachable presentation text.
 * Does not include file content or spawn `git`; status paths only.
 */

import {
  basenamePath,
  countLines,
  newContextItemId,
  type ComposerContextItem,
} from "./composerContext.js";
import { formatTerminalAttachText } from "../shared/terminalAttach.js";

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

export { formatTerminalAttachText };

/**
 * Build a diff context chip from host git context (patch or path/status summary).
 */
export function buildDiffContextItem(
  diff:
    | {
        branch?: string;
        patch?: string;
        files?: readonly GitDiffFileLine[];
      }
    | null
    | undefined,
): Extract<ComposerContextItem, { kind: "diff" }> | null {
  const patch =
    diff?.patch?.trim() ||
    formatGitDiffSummary({
      ...(diff?.branch ? { branch: diff.branch } : {}),
      files: diff?.files ?? [],
    }) ||
    "";
  if (!patch) {
    return null;
  }
  const name = diff?.branch ? `diff · ${diff.branch}` : "Working tree diff";
  return {
    id: newContextItemId("diff"),
    kind: "diff",
    name,
    text: patch,
    lines: countLines(patch),
  };
}

/**
 * Build a terminal context chip from host terminal context.
 */
export function buildTerminalContextItem(
  terminal:
    | {
        cwd?: string;
        selectedText?: string;
        lastCommand?: string;
      }
    | null
    | undefined,
): Extract<ComposerContextItem, { kind: "terminal" }> | null {
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
    return null;
  }
  return {
    id: newContextItemId("terminal"),
    kind: "terminal",
    name: terminal?.cwd ? basenamePath(terminal.cwd) : "Terminal",
    text,
    lines: countLines(text),
  };
}
