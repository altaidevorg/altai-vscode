import { describe, expect, it } from "vitest";
import {
  basenamePath,
  canMountProjectTarget,
  projectTargetFromWorkspace,
} from "../../src/webview/projectTargetChrome.js";

describe("canMountProjectTarget", () => {
  it("requires workspace.info", () => {
    expect(canMountProjectTarget({ workspaceInfo: true })).toBe(true);
    expect(canMountProjectTarget({ workspaceInfo: false })).toBe(false);
  });
});

describe("projectTargetFromWorkspace", () => {
  it("returns empty target without roots", () => {
    expect(projectTargetFromWorkspace(null)).toEqual({
      name: "Choose a project",
      path: null,
      kind: null,
      rootUri: null,
    });
  });

  it("prefers currentDir for path and name", () => {
    expect(
      projectTargetFromWorkspace({
        roots: ["file:///Users/me/altai-vscode"],
        currentDir: "/Users/me/altai-vscode",
        trusted: true,
      }),
    ).toEqual({
      name: "altai-vscode",
      path: "/Users/me/altai-vscode",
      kind: "local",
      rootUri: "file:///Users/me/altai-vscode",
    });
  });

  it("derives path from file URI when currentDir missing", () => {
    const view = projectTargetFromWorkspace({
      roots: ["file:///tmp/demo%20app"],
    });
    expect(view.name).toBe("demo app");
    expect(view.path).toBe("/tmp/demo app");
    expect(view.kind).toBe("local");
  });
});

describe("basenamePath", () => {
  it("handles trailing separators", () => {
    expect(basenamePath("/a/b/")).toBe("b");
    expect(basenamePath("C:\\foo\\bar\\")).toBe("bar");
  });
});
