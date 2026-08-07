/**
 * Pure policy for Extension Host host-error action notifications.
 */

import type { HostLifecycleStatus } from "./hostStatusNotify.js";

export type HostErrorAction = "altai.runDiagnostics" | "altai.restartAgentHost";

export const HOST_ERROR_ACTION_LABELS: Record<HostErrorAction, string> = {
  "altai.runDiagnostics": "Run Diagnostics",
  "altai.restartAgentHost": "Restart Host",
};

/**
 * Fire an error toast once when status enters `error` (not while remaining error).
 */
export function shouldPromptHostErrorActions(
  previous: HostLifecycleStatus | undefined,
  next: HostLifecycleStatus,
): boolean {
  return next === "error" && previous !== "error";
}

export function hostErrorActionCommands(): readonly HostErrorAction[] {
  return ["altai.runDiagnostics", "altai.restartAgentHost"];
}
