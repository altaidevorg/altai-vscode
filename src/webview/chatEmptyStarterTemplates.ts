/**
 * Default empty-chat starter templates (host-owned copy, shared grid UI).
 */

import type { PromptTemplate } from "@altai/agent-ui";

export const DEFAULT_CHAT_STARTERS: readonly PromptTemplate[] = [
  {
    label: "Fix a bug",
    value:
      "Reproduce and fix the reported bug. Explain root cause, show a minimal fix, and outline how to verify.",
  },
  {
    label: "Explain code",
    value:
      "Explain how the currently relevant code works. Prefer concrete paths, data flow, and failure modes.",
  },
  {
    label: "Write tests",
    value:
      "Add focused tests for the behavior we care about. Prefer existing project test conventions and run what is practical.",
  },
  {
    label: "Refactor safely",
    value:
      "Propose and apply a small, reviewable refactor that preserves behavior. Note risks and the verification plan.",
  },
  {
    label: "Review a PR",
    value:
      "Review the current working tree / branch changes. Flag correctness, edge cases, and missing tests.",
  },
  {
    label: "Ship checklist",
    value:
      "Draft a ship/release checklist for this change set: validation, docs, rollback, and risk notes.",
  },
];

export function shouldShowChatStarters(input: {
  emptyHome: boolean;
  canStartRun: boolean;
}): boolean {
  return input.emptyHome && input.canStartRun;
}
