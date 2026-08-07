import { describe, expect, it } from "vitest";
import {
  hostErrorActionCommands,
  hostRecoveredActionCommands,
  HOST_ERROR_ACTION_LABELS,
  shouldPromptHostErrorActions,
} from "../../src/shared/hostErrorActions.js";

describe("host error action toast policy", () => {
  it("prompts only on first entry into error", () => {
    expect(shouldPromptHostErrorActions(undefined, "error")).toBe(true);
    expect(shouldPromptHostErrorActions("ready", "error")).toBe(true);
    expect(shouldPromptHostErrorActions("error", "error")).toBe(false);
    expect(shouldPromptHostErrorActions("error", "ready")).toBe(false);
  });

  it("offers diagnostics then restart by default", () => {
    expect(hostErrorActionCommands()).toEqual([
      "altai.runDiagnostics",
      "altai.restartAgentHost",
    ]);
    expect(HOST_ERROR_ACTION_LABELS["altai.runDiagnostics"]).toMatch(
      /Diagnostics/,
    );
  });

  it("adapts actions for untrusted and missing host", () => {
    expect(
      hostErrorActionCommands({ diagnosticCode: "host.untrusted" }),
    ).toEqual([
      "workbench.action.manageWorkspaceTrust",
      "altai.runDiagnostics",
    ]);
    expect(hostErrorActionCommands({ diagnosticCode: "host.missing" })).toEqual(
      ["altai.openExtensionSettings", "altai.runDiagnostics"],
    );
  });

  it("offers Open ALTAI after recovery", () => {
    expect(hostRecoveredActionCommands()).toEqual(["altai.openSidePanel"]);
  });
});
