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
      patch: [
        "Working tree changes on main:",
        "- working-tree:1  src/main.ts",
      ].join("\n"),
    });
    expect(getAPI).toHaveBeenCalledWith(1);
  });

  it("prefers preferred URI repo then first dirty repo", async () => {
    const rootA = uri("/a");
    const rootB = uri("/b");
    const fileB = uri("/b/src/x.ts");
    const cleanRepo = {
      rootUri: rootA,
      state: {
        HEAD: { name: "clean" },
        workingTreeChanges: [],
        indexChanges: [],
        mergeChanges: [],
      },
    };
    const dirtyRepo = {
      rootUri: rootB,
      state: {
        HEAD: { name: "dirty" },
        workingTreeChanges: [{ uri: fileB, status: 2 }],
        indexChanges: [],
        mergeChanges: [],
      },
    };
    const getRepository = vi.fn((u: { path: string }) =>
      u.path.startsWith("/a") ? cleanRepo : dirtyRepo,
    );
    const getAPI = vi.fn(() => ({
      getRepository,
      repositories: [cleanRepo, dirtyRepo],
    }));
    const api = {
      extensions: {
        getExtension: vi.fn(() => ({
          isActive: true,
          exports: { getAPI },
        })),
      },
      window: { activeTextEditor: undefined },
      workspace: {
        workspaceFolders: [{ uri: rootA }, { uri: rootB }],
        asRelativePath: vi.fn((u: { path: string }) =>
          u.path.startsWith("/b") ? "src/x.ts" : "other.ts",
        ),
      },
    };

    const adapter = new GitDiffAdapter(api as never);
    adapter.setPreferredTargetUri(rootA as never);
    // preferred clean → fall through to dirty repo with changes
    await expect(adapter.getDiffContext()).resolves.toMatchObject({
      branch: "dirty",
      files: [{ path: "src/x.ts", status: "working-tree:2" }],
    });
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
