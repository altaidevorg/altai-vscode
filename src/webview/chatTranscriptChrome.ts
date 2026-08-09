/**
 * VS Code re-exports transcript chrome + frame from `@altai/agent-ui` (A6.32).
 */

export {
  AiChatTranscriptFrame,
  canRetryLastAssistantTurn,
  isRecoverableAttentionMessage,
  isRetryableRunOutcome,
  joinMessageTextParts,
  resolveChatAriaLive,
  resolveTranscriptRunErrorVariant,
  type AiChatTranscriptFrameProps,
  type TranscriptAriaLivePref,
} from "@altai/agent-ui";

/** Settings announce prefs use `ChatAnnouncePref` from extension preferences; aria-live input is looser. */
export type { TranscriptAriaLivePref as ChatAnnouncePref } from "@altai/agent-ui";
