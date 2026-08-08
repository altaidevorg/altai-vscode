/**
 * Trust helpers for context attach (Ask About *). Pure + VS Code-agnostic checks.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.122). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export function isWorkspaceNotTrustedError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return /workspace_not_trusted|not trusted/i.test(message);
}

/**
 * Whether a diagnostic URI should be included in workspace-wide Problems attach.
 * When a preferred multi-root folder is set, only that folder's files are included.
 */
export function includeUriInWorkspaceProblemsAttach(input: {
  uriFolderUri: string;
  preferredFolderUri?: string | null;
}): boolean {
  const preferred = input.preferredFolderUri?.trim();
  if (!preferred) {
    return true;
  }
  return input.uriFolderUri === preferred;
}
