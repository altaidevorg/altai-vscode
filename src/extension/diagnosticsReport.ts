/**
 * Structured ALTAI diagnostics report (V7 / TASK-012 observability).
 * Pure formatters — no vscode imports; commands write the lines to the output channel.
 */
import {
  formatDiagnostic,
  HostDiagnosticCode,
  type HostDiagnostic,
} from "./host/HostDiagnostics.js";
import { recoveryHintForDiagnosticCode } from "../shared/hostRecovery.js";

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
  /** Effective --workspace path preferred or first folder. */
  workspaceRoot?: string | undefined;
  /** Multi-root preferred host root (fs path), if set. */
  preferredWorkspaceRoot?: string | undefined;
  /** Open workspace folder fs paths (multi-root visibility). */
  workspaceFolders?: readonly string[] | undefined;
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
  return recoveryHintForDiagnosticCode(code);
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
    `  workspaceRoot=${host.workspaceRoot ?? "(none)"}`,
    `  preferredWorkspaceRoot=${host.preferredWorkspaceRoot ?? "(none)"}`,
    `  workspaceFolders=${
      host.workspaceFolders && host.workspaceFolders.length > 0
        ? host.workspaceFolders.join("|")
        : "(none)"
    }`,
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
      "  recovery=Open ALTAI: Open Logs and ALTAI: Restart Agent Host. If the host is missing, reinstall a target VSIX, set altai.agentHostPath, or set ALTAI_AGENT_HOST_PATH.",
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
