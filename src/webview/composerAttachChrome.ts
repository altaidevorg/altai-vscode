/**
 * Pure helpers: turn host editor/git/terminal state into attachable composer
 * context chips. Shared implementation lives in `@altai/agent-ui` (A6.94 + A6.99).
 */

export {
  buildDiffContextItem,
  buildFileContextItem,
  buildSelectionContextItem,
  buildTerminalContextItem,
  formatGitDiffSummary,
  formatTerminalAttachText,
  type GitDiffFileLine,
} from "@altai/agent-ui";
