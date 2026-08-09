/**
 * Host-neutral recovery copy for host.status diagnostic codes.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.130). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export function recoveryHintForDiagnosticCode(
  code: string | undefined,
): string | undefined {
  switch (code) {
    case "host.untrusted":
      return "Trust this workspace (Workspace Trust) so ALTAI can start the native agent host.";
    case "host.missing":
      return "Install a target VSIX with resources/native/<platform>/altai-agent-host, or set altai.agentHostPath / ALTAI_AGENT_HOST_PATH to an absolute altai-cli binary for local debug.";
    case "host.corrupt":
      return "Reinstall the extension VSIX or replace the host binary; if a .sha256 sidecar is present it must match the binary.";
    case "host.incompatible":
      return "Upgrade ALTAI or the native host so protocol majors match (see ALTAI: Show Version Compatibility).";
    case "host.crashed":
      return "Open ALTAI logs, restart the agent host (ALTAI: Restart Agent Host), and retry. If crashes persist, reinstall the packaged host.";
    case "host.frame_error":
      return "Host stdio framing failed — restart the agent host. Report if it repeats after a clean restart.";
    case "host.spawn_failed":
      return "The host process could not be spawned. Check execute permission, Remote extensionKind (workspace), and path validity.";
    case "host.no_workspace":
      return "Open a workspace folder so ALTAI can start the native agent host with a project root.";
    case "host.virtual_workspace":
      return "Open a local or remote machine folder (SSH/WSL/Container). Pure virtual / vscode.dev workspaces cannot run the native agent host.";
    default:
      return undefined;
  }
}
