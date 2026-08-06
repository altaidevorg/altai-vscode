/**
 * Structured ALTAI diagnostics report (V7 / TASK-012 observability).
 * Pure formatters — no vscode imports; commands write the lines to the output channel.
 */
import {
  formatDiagnostic,
  HostDiagnosticCode,
  type HostDiagnostic,
} from "./host/HostDiagnostics.js";

export type CompatibilityPins = {
  extension: string;
  agentUi: string;
  protocol: number | string;
  agentHost: string;
};

export type DiagnosticsEnvironment = {
  workspaceTrusted: boolean;
  remoteName: string | undefined;
  appHost: string;
  uiKind: string | number;
  extensionPath?: string | undefined;
};

export type DiagnosticsHostSnapshot = {
  lifecycle: string;
  resolvedPath: string | undefined;
  status: string;
  message: string;
  diagnostic: HostDiagnostic | undefined;
};

export type DiagnosticsReportInput = {
  compatibility: CompatibilityPins;
  env: DiagnosticsEnvironment;
  host: DiagnosticsHostSnapshot;
};

/**
 * Human recovery hint for a host diagnostic code. Empty when no structured hint.
 */
export function recoveryHintForDiagnostic(
  code: HostDiagnosticCode | string | undefined,
): string | undefined {
  switch (code) {
    case HostDiagnosticCode.Untrusted:
      return "Trust this workspace (Workspace Trust) so ALTAI can start the native agent host.";
    case HostDiagnosticCode.Missing:
      return "Install a target VSIX with resources/native/<platform>/altai-agent-host, or set ALTAI_AGENT_HOST_PATH to an absolute altai-cli binary for local debug.";
    case HostDiagnosticCode.Corrupt:
      return "Reinstall the extension VSIX or replace the host binary; if a .sha256 sidecar is present it must match the binary.";
    case HostDiagnosticCode.Incompatible:
      return "Upgrade ALTAI or the native host so protocol majors match (see ALTAI: Show Version Compatibility).";
    case HostDiagnosticCode.Crashed:
      return "Open ALTAI logs, restart the agent host (ALTAI: Restart Agent Host), and retry. If crashes persist, reinstall the packaged host.";
    case HostDiagnosticCode.FrameError:
      return "Host stdio framing failed — restart the agent host. Report if it repeats after a clean restart.";
    case HostDiagnosticCode.SpawnFailed:
      return "The host process could not be spawned. Check execute permission, Remote extensionKind (workspace), and path validity.";
    default:
      return undefined;
  }
}

/**
 * Format a full diagnostics dump as output-channel lines.
 */
export function formatDiagnosticsReport(
  input: DiagnosticsReportInput,
): string[] {
  const { compatibility: c, env, host } = input;
  const lines: string[] = [
    "[altai] diagnostics",
    `  extension=${c.extension}`,
    `  agentUi=${c.agentUi}`,
    `  protocol=${c.protocol}`,
    `  agentHost=${c.agentHost}`,
    `  workspaceTrusted=${env.workspaceTrusted ? "yes" : "no"}`,
    `  remoteName=${env.remoteName ?? "(local)"}`,
    `  appHost=${env.appHost}`,
    `  uiKind=${env.uiKind}`,
  ];

  if (env.extensionPath) {
    lines.push(`  extensionPath=${env.extensionPath}`);
  }

  lines.push(
    `  resolvedPath=${host.resolvedPath ?? "(none)"}`,
    `  lifecycle=${host.lifecycle}`,
    `  diagnosticCode=${host.diagnostic?.code ?? "(none)"}`,
    `  hostStatus=${host.status}`,
    `  hostMessage=${host.message}`,
  );

  if (host.diagnostic) {
    lines.push(`  diagnostic=${formatDiagnostic(host.diagnostic)}`);
  }

  const hint = recoveryHintForDiagnostic(host.diagnostic?.code);
  if (hint) {
    lines.push(`  recovery=${hint}`);
  } else if (!env.workspaceTrusted) {
    lines.push(
      `  recovery=${recoveryHintForDiagnostic(HostDiagnosticCode.Untrusted)}`,
    );
  } else if (host.lifecycle === "Error" || host.status === "error") {
    lines.push(
      "  recovery=Open ALTAI: Open Logs and ALTAI: Restart Agent Host. If the host is missing, reinstall a target VSIX or set ALTAI_AGENT_HOST_PATH.",
    );
  } else if (host.lifecycle === "Ready") {
    lines.push("  recovery=(none) host is ready");
  }

  return lines;
}

export function formatCompatibilitySummary(
  compatibility: CompatibilityPins,
): string {
  return `ALTAI ${compatibility.extension} · UI ${compatibility.agentUi} · protocol ${compatibility.protocol} · host ${compatibility.agentHost}`;
}
