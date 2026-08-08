/**
 * VS Code re-exports the shared chat display transcript model from
 * `@altai/agent-ui` (A6.31). Host ports still map run/event notifications.
 */

export {
  appendMetaMessage,
  appendUserMessage,
  applyAgentEventToMessages,
  displayMessagesFromSession,
  extractEditDiff,
  extractTodoToolItems,
  extractToolFileTarget,
  isTodoToolName,
  looksLikePath,
  newDisplayMessageId,
  parseCommandMarkerPrefix,
  pathToFileUri,
  prepareUserTurnDisplay,
  renumberUserTurnIds,
  shouldShowChatEmptyHome,
  textFromAgentEvent,
  toolBubbleContent,
  wrapWithCommandMarker,
  ALTAI_COMMAND_MARKER_RE,
  ALTAI_CMD_RE,
  type ChatDisplayMessage,
  type ChatDisplayRole,
  type SessionMessageLike,
} from "@altai/agent-ui";

export type { TodoItem } from "@altai/agent-ui";

/** Host alias for todo tool re-exports used by older imports. */
export {
  parseTodoItemsFromInput,
  summarizeTodoItems,
} from "@altai/agent-ui";
