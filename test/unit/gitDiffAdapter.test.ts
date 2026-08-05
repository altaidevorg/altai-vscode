import { describe, expect, it, vi } from "vitest";
import { GitDiffAdapter } from "../../src/extension/vscode/GitDiffAdapter.js";

function uri(path: string) {
  return {
    path,
    fsPath: path,
    toString: () => `file://${path}`,
  };
}

describe("GitDiffAdapter", () => {
  it("reads branch and changed-file state from VS Code's Git extension API", async () => {
    const root = uri("/workspace");
    const source = uri("/workspace/src/main.ts");
    const repository = {
      rootUri: root,
      state: {
        HEAD: { name: "main" },
        workingTreeChanges: [{ uri: source, status: 1 }],
        indexChanges: [],
        mergeChanges: [],
      },
    };
    const getAPI = vi.fn(() => ({
      getRepository: vi.fn(() => repository),
      repositories: [repository],
    }));
    const api = {
      extensions: {
        getExtension: vi.fn(() => ({
          isActive: false,
          activate: vi.fn(async () => ({ getAPI })),
        })),
      },
      window: { activeTextEditor: { document: { uri: source } } },
      workspace: {
        workspaceFolders: [{ uri: root }],
        asRelativePath: vi.fn(() => "src/main.ts"),
      },
    };

    await expect(new GitDiffAdapter(api as never).getDiffContext()).resolves.toEqual({
      branch: "main",
      files: [{ path: "src/main.ts", status: "working-tree:1" }],
    });
    expect(getAPI).toHaveBeenCalledWith(1);
  });

  it("returns null when VS Code's Git extension is unavailable", async () => {
    const api = {
      extensions: { getExtension: vi.fn(() => undefined) },
      window: { activeTextEditor: undefined },
      workspace: { workspaceFolders: [], asRelativePath: vi.fn() },
    };
    await expect(new GitDiffAdapter(api as never).getDiffContext()).resolves.toBeNull();
  });
});
