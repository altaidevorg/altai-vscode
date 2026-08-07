/**
 * Pure policy for Extension Host host-error action notifications.
 */

import type { HostLifecycleStatus } from "./hostStatusNotify.js";

export type HostErrorAction =
  | "altai.runDiagnostics"
  | "altai.restartAgentHost"
  | "workbench.action.manageWorkspaceTrust"
  | "altai.openExtensionSettings"
  | "altai.openSidePanel";

export const HOST_ERROR_ACTION_LABELS: Record<HostErrorAction, string> = {
  "altai.runDiagnostics": "Run Diagnostics",
  "altai.restartAgentHost": "Restart Host",
  "workbench.action.manageWorkspaceTrust": "Manage Trust",
  "altai.openExtensionSettings": "Host Path Settings",
  "altai.openSidePanel": "Open ALTAI",
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

/**
 * Choose a short list of real Extension Host / VS Code commands for the toast.
 */
export function hostErrorActionCommands(input?: {
  diagnosticCode?: string;
}): readonly HostErrorAction[] {
  const code = input?.diagnosticCode?.trim() ?? "";
  if (code === "host.untrusted") {
    return [
      "workbench.action.manageWorkspaceTrust",
      "altai.runDiagnostics",
    ];
  }
  if (code === "host.missing") {
    return ["altai.openExtensionSettings", "altai.runDiagnostics"];
  }
  return ["altai.runDiagnostics", "altai.restartAgentHost"];
}

export function hostRecoveredActionCommands(): readonly HostErrorAction[] {
  return ["altai.openSidePanel"];
}
