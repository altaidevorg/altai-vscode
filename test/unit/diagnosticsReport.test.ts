import { describe, expect, it } from "vitest";
import { HostDiagnosticCode } from "../../src/extension/host/HostDiagnostics.js";
import {
  formatCompatibilitySummary,
  formatDiagnosticsReport,
  recoveryHintForDiagnostic,
} from "../../src/extension/diagnosticsReport.js";

const baseCompat = {
  extension: "0.1.0",
  agentUi: "0.1.0",
  protocol: 1,
  agentHost: "stdio-via-altai-cli-serve",
} as const;

describe("recoveryHintForDiagnostic", () => {
  it("returns actionable hints for host failure codes", () => {
    expect(recoveryHintForDiagnostic(HostDiagnosticCode.Missing)).toMatch(
      /ALTAI_AGENT_HOST_PATH|VSIX/,
    );
    expect(recoveryHintForDiagnostic(HostDiagnosticCode.Untrusted)).toMatch(
      /Trust this workspace/,
    );
    expect(recoveryHintForDiagnostic(HostDiagnosticCode.Corrupt)).toMatch(
      /sha256|Reinstall/i,
    );
    expect(recoveryHintForDiagnostic("unknown")).toBeUndefined();
  });
});

describe("formatDiagnosticsReport", () => {
  it("includes compatibility, remote env, and recovery for missing host", () => {
    const lines = formatDiagnosticsReport({
      compatibility: baseCompat,
      env: {
        workspaceTrusted: true,
        remoteName: "ssh-remote",
        appHost: "desktop",
        uiKind: 1,
        extensionPath: "/ext/altai",
      },
      host: {
        lifecycle: "Error",
        resolvedPath: undefined,
        status: "error",
        message: "Packaged ALTAI agent host binary not found",
        diagnostic: {
          code: HostDiagnosticCode.Missing,
          message: "Packaged ALTAI agent host binary not found",
          details: "/ext/resources/native/darwin-arm64/altai-agent-host",
        },
      },
    });

    expect(lines[0]).toBe("[altai] diagnostics");
    expect(lines).toContain("  extension=0.1.0");
    expect(lines).toContain("  remoteName=ssh-remote");
    expect(lines).toContain("  extensionPath=/ext/altai");
    expect(lines.some((l) => l.startsWith("  diagnostic=[host.missing]"))).toBe(
      true,
    );
    expect(
      lines.some(
        (l) => l.startsWith("  recovery=") && l.includes("ALTAI_AGENT_HOST_PATH"),
      ),
    ).toBe(true);
  });

  it("suggests trust recovery when workspace is untrusted without a diagnostic", () => {
    const lines = formatDiagnosticsReport({
      compatibility: baseCompat,
      env: {
        workspaceTrusted: false,
        remoteName: undefined,
        appHost: "desktop",
        uiKind: 1,
      },
      host: {
        lifecycle: "Idle",
        resolvedPath: undefined,
        status: "idle",
        message: "waiting",
        diagnostic: undefined,
      },
    });
    expect(lines).toContain("  remoteName=(local)");
    expect(lines).toContain("  workspaceTrusted=no");
    expect(lines.some((l) => l.includes("Trust this workspace"))).toBe(true);
  });

  it("marks ready hosts with no recovery action", () => {
    const lines = formatDiagnosticsReport({
      compatibility: baseCompat,
      env: {
        workspaceTrusted: true,
        remoteName: undefined,
        appHost: "desktop",
        uiKind: 1,
      },
      host: {
        lifecycle: "Ready",
        resolvedPath: "/bin/host",
        status: "ready",
        message: "ok",
        diagnostic: undefined,
      },
    });
    expect(lines).toContain("  recovery=(none) host is ready");
  });
});

describe("formatCompatibilitySummary", () => {
  it("formats the status-bar friendly string", () => {
    expect(formatCompatibilitySummary(baseCompat)).toBe(
      "ALTAI 0.1.0 · UI 0.1.0 · protocol 1 · host stdio-via-altai-cli-serve",
    );
  });
});
