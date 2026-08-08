/**
 * VS Code re-exports shared display-message action flags from
 * `@altai/agent-ui` (A6.39). Host still owns clipboard / open-file I/O.
 */

export {
  canCopyDisplayMessage,
  hasDisplayMessageActions,
  lastAssistantMessageId,
  resolveDisplayMessageActions,
  type DisplayMessageActionFlags,
  type DisplayMessageActionInput,
} from "@altai/agent-ui";
