/**
 * Pure helpers for composer context attachments (files, selection, git diff,
 * terminal) before a startRun. Shared implementation lives in `@altai/agent-ui`
 * (A6.98). Package already exports basenamePath via project-target chrome.
 */

export {
  addContextItem,
  basenamePath,
  clipContextText,
  composeRunPrompt,
  countLines,
  formatTextContextBlocks,
  listOpenableContextItems,
  newContextItemId,
  removeContextItem,
  resolveContextOpenUri,
  toComposerAttachFiles,
  toContextChips,
  toRunAttachments,
  type ComposerContextItem,
  type OpenableContextItem,
} from "@altai/agent-ui";
