/**
 * Pure helpers for capability-gating the shared WorkspaceTopbarActions cluster.
 */

export type WorkspaceTopbarFlags = {
  taskRuns: boolean;
  automations: boolean;
  inbox: boolean;
};

/**
 * Mount the Work / Inbox cluster only when at least one Operations domain
 * route is available (no dead buttons).
 */
export function canMountWorkspaceTopbar(flags: WorkspaceTopbarFlags): boolean {
  return flags.taskRuns || flags.automations || flags.inbox;
}

export function workspaceTopbarWorkOpen(
  surface: "chat" | "operations",
  operationsView: string,
): boolean {
  return surface === "operations" && operationsView === "work";
}

export function workspaceTopbarInboxOpen(
  surface: "chat" | "operations",
  operationsView: string,
): boolean {
  return surface === "operations" && operationsView === "inbox";
}
