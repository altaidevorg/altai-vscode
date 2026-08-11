/** Pure helpers for capability-gating canonical Work OS topbar actions. */

export {
  workspaceTopbarInboxOpen,
  workspaceTopbarWorkOpen,
} from "@altai/agent-ui";

export type WorkOsTopbarFlags = {
  work: boolean;
  inbox: boolean;
  inspector?: boolean;
};

export type WorkOsTopbarMode = "hidden" | "inspector" | "work";

export function resolveWorkOsTopbarMode(
  flags: WorkOsTopbarFlags,
): WorkOsTopbarMode {
  if (flags.work && flags.inbox) return "work";
  if (flags.inspector === true) return "inspector";
  return "hidden";
}

export function canMountWorkOsTopbar(flags: WorkOsTopbarFlags): boolean {
  return resolveWorkOsTopbarMode(flags) !== "hidden";
}
