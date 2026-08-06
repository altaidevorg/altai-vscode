/**
 * Pure helpers for the composer `@file` mention trigger.
 * Shared implementation lives in `@altai/agent-ui` (Wave 4 / A6.9).
 */

export {
  AT_MENTION_MIN_QUERY,
  detectAtMention,
  nextAtMentionIndex,
  pathForSuggestionList,
  removeAtMentionToken,
  shouldSearchAtMention,
  type AtMentionRange,
} from "@altai/agent-ui";
