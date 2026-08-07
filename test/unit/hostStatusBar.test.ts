import { describe, expect, it } from "vitest";
import { hostStatusBarPresentation } from "../../src/shared/hostStatusBar.js";

describe("hostStatusBarPresentation", () => {
  it("hides when host is ready", () => {
    expect(
      hostStatusBarPresentation({
        status: "ready",
        message: "ready",
      }),
    ).toMatchObject({ show: false });
  });

  it("shows connecting and disconnected states", () => {
    expect(
      hostStatusBarPresentation({
        status: "connecting",
        message: "starting",
      }),
    ).toMatchObject({
      show: true,
      command: "altai.openSidePanel",
    });
    expect(
      hostStatusBarPresentation({
        status: "disconnected",
        message: "stopped",
      }),
    ).toMatchObject({
      show: true,
      command: "altai.openSidePanel",
    });
  });

  it("routes errors to diagnostics", () => {
    expect(
      hostStatusBarPresentation({
        status: "error",
        message: "spawn failed",
        diagnosticCode: "host.missing",
      }),
    ).toMatchObject({
      show: true,
      warning: true,
      command: "altai.runDiagnostics",
      tooltip: expect.stringContaining("host.missing"),
    });
  });
});
