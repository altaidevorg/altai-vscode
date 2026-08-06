/**
 * Pure allowlist and labels for recovery actions on the wait shell.
 * Extension only runs these via WorkspaceAdapter.executeAltaiCommand.
 */

export const ALTAI_RECOVERY_COMMANDS = [
  "altai.openLogs",
  "altai.runDiagnostics",
  "altai.restartAgentHost",
  "altai.showVersionCompatibility",
  "altai.connectProvider",
  "workbench.action.manageWorkspaceTrust",
] as const;

export type AltaiRecoveryCommand = (typeof ALTAI_RECOVERY_COMMANDS)[number];

export type RecoveryAction = {
  command: AltaiRecoveryCommand;
  label: string;
};

export function isAltaiRecoveryCommand(
  value: string,
): value is AltaiRecoveryCommand {
  return (ALTAI_RECOVERY_COMMANDS as readonly string[]).includes(value);
}

/**
 * Wait-shell / Settings recovery buttons.
 * When the host reports `host.untrusted`, surface Manage workspace trust first.
 */
export function listRecoveryActions(input?: {
  diagnosticCode?: string;
}): readonly RecoveryAction[] {
  const actions: RecoveryAction[] = [];
  if (input?.diagnosticCode === "host.untrusted") {
    actions.push({
      command: "workbench.action.manageWorkspaceTrust",
      label: "Manage workspace trust",
    });
  }
  actions.push(
    { command: "altai.openLogs", label: "Open logs" },
    { command: "altai.runDiagnostics", label: "Run diagnostics" },
    { command: "altai.restartAgentHost", label: "Restart host" },
    { command: "altai.showVersionCompatibility", label: "Version" },
  );
  return actions;
}
