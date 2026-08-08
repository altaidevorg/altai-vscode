/**
 * VS Code re-exports AI-SDK assistant group chrome from `@altai/agent-ui`
 * (A6.41). Flat ChatMessageList still uses AiDisplayTranscriptList; this is
 * for hosts that adopt the AI SDK message part model.
 */

export {
  AiSdkAssistantGroups,
  isStandaloneReadToolPart,
  shouldShowAssistantRunActions,
  type AiSdkAssistantGroupsProps,
} from "@altai/agent-ui";
