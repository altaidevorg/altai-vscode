import { describe, expect, it } from "vitest";
import {
  hostErrorActionCommands,
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

  it("offers diagnostics then restart", () => {
    expect(hostErrorActionCommands()).toEqual([
      "altai.runDiagnostics",
      "altai.restartAgentHost",
    ]);
    expect(HOST_ERROR_ACTION_LABELS["altai.runDiagnostics"]).toMatch(
      /Diagnostics/,
    );
  });
});
