/**
 * Pure helpers for edit-and-resend of user turns in the chat transcript.
 * Shared implementation lives in `@altai/agent-ui` (Wave 4 / A6.19).
 *
 * Editing user turn N discards that turn and everything after it
 * (keep_user_messages = N - 1), then starts a fresh run with the edited text.
 */

export {
  canEditUserMessage,
  parseUserTurnId,
  renumberUserTurnIds as withStableUserTurnIds,
  truncateBoundaryForEdit,
  truncateDisplayAfterUserTurn,
} from "@altai/agent-ui";
