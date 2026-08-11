import { describe, expect, it } from "vitest";
import {
  canMountWorkOsTopbar,
  resolveWorkOsTopbarMode,
  workspaceTopbarInboxOpen,
  workspaceTopbarWorkOpen,
} from "../../src/webview/chatWorkspaceTopbar.js";

describe("canMountWorkOsTopbar", () => {
  it("mounts the canonical cluster only as a pair or keeps the inspector alone", () => {
    expect(
      canMountWorkOsTopbar({
        work: false,
        inbox: false,
      }),
    ).toBe(false);
    expect(
      canMountWorkOsTopbar({
        work: true,
        inbox: false,
      }),
    ).toBe(false);
    expect(
      canMountWorkOsTopbar({
        work: false,
        inbox: true,
      }),
    ).toBe(false);
    expect(
      canMountWorkOsTopbar({
        work: false,
        inbox: false,
        inspector: true,
      }),
    ).toBe(true);
    expect(
      canMountWorkOsTopbar({
        work: true,
        inbox: true,
      }),
    ).toBe(true);
  });

  it("keeps only the independent inspector for partial host capabilities", () => {
    expect(
      resolveWorkOsTopbarMode({ work: false, inbox: false, inspector: true }),
    ).toBe("inspector");
    expect(
      resolveWorkOsTopbarMode({ work: true, inbox: false, inspector: true }),
    ).toBe("inspector");
    expect(
      resolveWorkOsTopbarMode({ work: false, inbox: true, inspector: true }),
    ).toBe("inspector");
    expect(
      resolveWorkOsTopbarMode({ work: true, inbox: true, inspector: true }),
    ).toBe("work");
  });
});

describe("workspace topbar pressed state", () => {
  it("marks work or inbox open only on the Operations surface", () => {
    expect(workspaceTopbarWorkOpen("chat", "work")).toBe(false);
    expect(workspaceTopbarWorkOpen("operations", "work")).toBe(true);
    expect(workspaceTopbarInboxOpen("operations", "inbox")).toBe(true);
    expect(workspaceTopbarInboxOpen("operations", "overview")).toBe(false);
  });
});
