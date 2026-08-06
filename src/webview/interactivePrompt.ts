/**
 * Pure parsing of host AgentEvent payloads into Chat interactive prompts.
 * Shared implementation lives in `@altai/agent-ui` (Wave 4 / A6.17).
 */

export {
  applyInteractivePrompt,
  interactivePromptFromAgentEvent,
  normalizeAgentEventType,
  type InteractivePrompt,
  type PendingClarificationPrompt,
  type PendingEditDiff,
  type PendingToolApproval,
} from "@altai/agent-ui";
