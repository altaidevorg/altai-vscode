import { describe, expect, it } from "vitest";
import {
  ALTAI_RECOVERY_COMMANDS,
  isAltaiRecoveryCommand,
  listRecoveryActions,
} from "../../src/shared/hostRecoveryCommands.js";

describe("host recovery actions", () => {
  it("allowlists open logs, diagnostics, restart, and version", () => {
    expect(listRecoveryActions().map((a) => a.command)).toEqual([
      "altai.openLogs",
      "altai.runDiagnostics",
      "altai.restartAgentHost",
      "altai.showVersionCompatibility",
    ]);
    expect(isAltaiRecoveryCommand("altai.openLogs")).toBe(true);
    expect(isAltaiRecoveryCommand("altai.connectProvider")).toBe(true);
    expect(isAltaiRecoveryCommand("altai.clearProviderCredential")).toBe(true);
    expect(isAltaiRecoveryCommand("workbench.action.quit")).toBe(false);
  });

  it("includes slash-facing credential commands in the allowlist", () => {
    expect(ALTAI_RECOVERY_COMMANDS).toContain("altai.connectProvider");
    expect(ALTAI_RECOVERY_COMMANDS).toContain("altai.clearProviderCredential");
  });

  it("prepends manage workspace trust when host is untrusted", () => {
    expect(
      listRecoveryActions({ diagnosticCode: "host.untrusted" }).map(
        (a) => a.command,
      ),
    ).toEqual([
      "workbench.action.manageWorkspaceTrust",
      "altai.openLogs",
      "altai.runDiagnostics",
      "altai.restartAgentHost",
      "altai.showVersionCompatibility",
    ]);
  });
});
