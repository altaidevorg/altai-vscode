/**
 * VS Code re-exports flat tool-group transcript policy from `@altai/agent-ui`
 * (A6.29). Host ChatMessageList still owns React chrome + open-file actions.
 */

export {
  buildDisplayTranscriptBlocks,
  groupCountLabel,
  groupLabel,
  groupPreview,
  normalizeToolName,
  toolGroupKindFor,
  type DisplayToolGroupKind as ToolGroupKind,
  type DisplayTranscriptBlock,
  type TranscriptDisplayMessage,
} from "@altai/agent-ui";
