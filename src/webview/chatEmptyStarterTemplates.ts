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
    label: "PR review (#pr)",
    value:
      "#pr Review the current working-tree and staged changes carefully. Cite paths.",
  },
  {
    label: "Test plan (#testplan)",
    value:
      "#testplan Draft a concrete verification plan for the current change with real project commands.",
  },
  {
    label: "Ship checklist",
    value:
      "Draft a ship/release checklist for this change set: validation, docs, rollback, and risk notes.",
  },
  {
    label: "Map the repo",
    value:
      "Inspect this workspace without changing files. Produce a compact codebase map: entry points, major modules, data flow, and conventions.",
  },
  {
    label: "List commands (/help)",
    value: "/help",
  },
  {
    label: "Open Settings",
    value: "/settings",
  },
  {
    label: "New chat (/new)",
    value: "/new",
  },
  {
    label: "Attach working tree (/wt)",
    value: "/attach-diff",
  },
  {
    label: "Operations work (/tasks)",
    value: "/tasks",
  },
];

export function shouldShowChatStarters(input: {
  emptyHome: boolean;
  canStartRun: boolean;
}): boolean {
  return input.emptyHome && input.canStartRun;
}
