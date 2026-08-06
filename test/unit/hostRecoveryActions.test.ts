import { describe, expect, it } from "vitest";
import {
  isAltaiRecoveryCommand,
  listRecoveryActions,
} from "../../src/webview/hostRecoveryActions.js";

describe("host recovery actions", () => {
  it("allowlists open logs, diagnostics, and restart", () => {
    expect(listRecoveryActions().map((a) => a.command)).toEqual([
      "altai.openLogs",
      "altai.runDiagnostics",
      "altai.restartAgentHost",
    ]);
    expect(isAltaiRecoveryCommand("altai.openLogs")).toBe(true);
    expect(isAltaiRecoveryCommand("workbench.action.quit")).toBe(false);
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
    ]);
    expect(isAltaiRecoveryCommand("workbench.action.manageWorkspaceTrust")).toBe(
      true,
    );
  });
});
