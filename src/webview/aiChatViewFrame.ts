/**
 * VS Code re-exports ports-first AiChatViewFrame from `@altai/agent-ui` (A6.42).
 * Flat ChatMessageList remains the active VS Code path until AI-SDK cutover.
 */

export {
  AiChatViewFrame,
  buildAiChatViewRowMeta,
  type AiChatViewFrameProps,
  type AiChatViewMessageLike,
  type AiChatViewRowMeta,
} from "@altai/agent-ui";
