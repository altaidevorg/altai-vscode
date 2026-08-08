/**
 * Pure helpers: prefer soft-archive over hard-delete for chat sessions.
 * Shared implementation lives in `@altai/agent-ui` (A6.80).
 */

export {
  resolveSessionRemoveMode,
  sessionRemoveErrorMessage,
  type SessionRemoveMode,
} from "@altai/agent-ui";
