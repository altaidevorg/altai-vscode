import { describe, expect, it } from "vitest";
import { isVirtualOnlyWorkspace } from "../../src/shared/virtualWorkspace.js";

describe("isVirtualOnlyWorkspace", () => {
  it("is false for empty and local folders", () => {
    expect(isVirtualOnlyWorkspace([])).toBe(false);
    expect(
      isVirtualOnlyWorkspace([{ scheme: "file", fsPath: "/Users/me/proj" }]),
    ).toBe(false);
    expect(
      isVirtualOnlyWorkspace([
        { scheme: "vscode-remote", fsPath: "/home/me/proj" },
      ]),
    ).toBe(false);
  });

  it("is true when every folder is virtual", () => {
    expect(
      isVirtualOnlyWorkspace([{ scheme: "vscode-vfs", fsPath: "" }]),
    ).toBe(true);
    expect(
      isVirtualOnlyWorkspace([
        { scheme: "vscode-vfs", fsPath: "github/owner/repo" },
        { scheme: "untitled" },
      ]),
    ).toBe(true);
  });

  it("is false when any real folder is present", () => {
    expect(
      isVirtualOnlyWorkspace([
        { scheme: "vscode-vfs", fsPath: "github/x" },
        { scheme: "file", fsPath: "/tmp" },
      ]),
    ).toBe(false);
  });
});
