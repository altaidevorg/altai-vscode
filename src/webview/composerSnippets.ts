/**
 * VS Code re-exports pure #snippet helpers from `@altai/agent-ui` (A6.26)
 * and keeps the extension’s built-in DEFAULT_SNIPPETS catalog.
 */

export {
  expandSnippetTokens,
  composePromptWithSnippets,
  insertSnippetHandle,
  findSnippets,
  parseWorkspaceSnippetsJson,
  mergeSnippetCatalogs,
  addPickedSnippet,
  removePickedSnippet,
  normalizeHandle,
  isValidHandle,
  type ComposerSnippet,
  type PickedComposerSnippet,
} from "@altai/agent-ui";

import type { ComposerSnippet } from "@altai/agent-ui";

/** Host alias for the shared snippet shape (Desktop also uses Snippet). */
export type Snippet = ComposerSnippet;
export type PickedSnippet = Pick<
  Snippet,
  "id" | "handle" | "name" | "description"
>;

/** Built-in catalog shipped with the extension (always available). */
export const DEFAULT_SNIPPETS: readonly Snippet[] = Object.freeze([
  {
    id: "builtin-pr",
    handle: "pr",
    name: "PR review",
    description: "Review the current diff as a pull request",
    content:
      "Review the current working-tree and staged changes as if this were a PR. Check correctness, regressions, security, tests, and clarity. Cite paths. Do not modify files unless I ask.",
  },
  {
    id: "builtin-test",
    handle: "testplan",
    name: "Test plan",
    description: "Draft a verification plan for the change",
    content:
      "Draft a concrete verification plan for the current change: commands to run, edge cases, rollback risk, and what evidence “done” requires. Prefer the project’s real test scripts.",
  },
  {
    id: "builtin-explain",
    handle: "explain",
    name: "Explain deeply",
    description: "Deep explanation with citations",
    content:
      "Explain the relevant code end-to-end. Walk data flow, invariants, and failure modes. Cite concrete file paths. Do not change files.",
  },
  {
    id: "builtin-fix",
    handle: "reproduce",
    name: "Reproduce bug",
    description: "Focus investigation and minimal fix",
    content:
      "Reproduce the described issue first. Trace the root cause with evidence (paths, commands, logs), then apply the smallest safe fix and verify.",
  },
  {
    id: "builtin-commit",
    handle: "commitmsg",
    name: "Commit message",
    description: "Draft a commit message from the diff",
    content:
      "Inspect the current git status and diff. Draft a concise conventional commit message (subject ≤72 chars) and a short body explaining why. Do not create a commit.",
  },
]);
