/**
 * Pure allowlist and labels for recovery actions on the wait shell.
 * Extension only runs these via WorkspaceAdapter.executeAltaiCommand.
 */

export const ALTAI_RECOVERY_COMMANDS = [
  "altai.openLogs",
  "altai.runDiagnostics",
  "altai.restartAgentHost",
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

export function listRecoveryActions(): readonly RecoveryAction[] {
  return [
    { command: "altai.openLogs", label: "Open logs" },
    { command: "altai.runDiagnostics", label: "Run diagnostics" },
    { command: "altai.restartAgentHost", label: "Restart host" },
  ];
}
