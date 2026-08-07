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

  it("routes errors by diagnostic code", () => {
    expect(
      hostStatusBarPresentation({
        status: "error",
        message: "spawn failed",
        diagnosticCode: "host.missing",
      }),
    ).toMatchObject({
      show: true,
      warning: true,
      command: "altai.openExtensionSettings",
      tooltip: expect.stringContaining("Host Path Settings"),
    });
    expect(
      hostStatusBarPresentation({
        status: "error",
        message: "blocked",
        diagnosticCode: "host.untrusted",
      }),
    ).toMatchObject({
      command: "workbench.action.manageWorkspaceTrust",
      tooltip: expect.stringContaining("Manage Trust"),
    });
    expect(
      hostStatusBarPresentation({
        status: "error",
        message: "spawn failed",
      }),
    ).toMatchObject({
      command: "altai.runDiagnostics",
    });
  });

  it("routes disconnected + diagnostic to recovery commands", () => {
    expect(
      hostStatusBarPresentation({
        status: "disconnected",
        message: "not started",
        diagnosticCode: "host.untrusted",
      }),
    ).toMatchObject({
      show: true,
      warning: true,
      command: "workbench.action.manageWorkspaceTrust",
    });
  });
});
