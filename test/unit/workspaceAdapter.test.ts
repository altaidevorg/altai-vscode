import { describe, expect, it, vi } from "vitest";
import { WorkspaceAdapter } from "../../src/extension/vscode/WorkspaceAdapter.js";

type FakeUri = {
  path: string;
  fsPath: string;
  toString(): string;
};

function uri(path: string): FakeUri {
  return {
    path,
    fsPath: path,
    toString: () => `file://${path}`,
  };
}

function createAdapter(isTrusted = true) {
  const root = uri("/workspace");
  const source = uri("/workspace/src/main.ts");
  const executeCommand = vi.fn(async () => undefined);
  const createReviewUri = vi.fn((label: string) => uri(`/review/${label}`));
  const api = {
    workspace: {
      isTrusted,
      workspaceFolders: [{ uri: root }],
      getWorkspaceFolder: vi.fn((candidate: FakeUri) =>
        candidate.path === "/workspace" ||
        candidate.path.startsWith("/workspace/")
          ? { uri: root }
          : undefined,
      ),
      findFiles: vi.fn(async () => [source]),
      fs: {
        stat: vi.fn(async () => ({ size: 12 })),
        readFile: vi.fn(async () => Buffer.from("const a = 1;")),
      },
      openTextDocument: vi.fn(async (candidate: FakeUri) => ({ uri: candidate })),
    },
    window: {
      activeTextEditor: undefined,
      showTextDocument: vi.fn(async () => ({
        revealRange: vi.fn(),
      })),
      showQuickPick: vi.fn(async () => undefined),
    },
    Uri: {
      parse: vi.fn((value: string) => {
        if (value === source.toString()) {
          return source;
        }
        if (value === root.toString()) {
          return root;
        }
        if (value === "file:///workspace/pkg") {
          return uri("/workspace/pkg");
        }
        if (value === "file:///outside.txt") {
          return uri("/outside.txt");
        }
        if (value.startsWith("https://") || value.startsWith("http://")) {
          return {
            path: value,
            fsPath: value,
            scheme: value.startsWith("https") ? "https" : "http",
            toString: () => value,
          };
        }
        throw new Error("bad URI");
      }),
    },
    Selection: class {},
    TextEditorRevealType: { InCenterIfOutsideViewport: 0 },
    commands: { executeCommand },
    env: {
      openExternal: vi.fn(async () => true),
    },
  };
  return {
    adapter: new WorkspaceAdapter(
      api as never,
      () => isTrusted,
      createReviewUri as never,
      async () => ({ branch: "main", files: [{ path: "src/main.ts", status: "working-tree:1" }] }),
    ),
    api,
    createReviewUri,
  };
}

describe("WorkspaceAdapter", () => {
  it("keeps bounded workspace search and file reads in the Extension Host", async () => {
    const { adapter, api } = createAdapter();

    await expect(adapter.request("getWorkspace")).resolves.toMatchObject({
      roots: ["file:///workspace"],
      trusted: true,
    });
    await expect(adapter.request("searchFiles", { query: "main" })).resolves.toEqual([
      { uri: "file:///workspace/src/main.ts", path: "/workspace/src/main.ts" },
    ]);
    await expect(
      adapter.request("readFile", { uri: "file:///workspace/src/main.ts" }),
    ).resolves.toMatchObject({ text: "const a = 1;", truncated: false });

    expect(api.workspace.findFiles).toHaveBeenCalledWith(
      "**/*main*",
      "**/{.git,node_modules}/**",
      100,
    );
  });

  it("rejects untrusted and out-of-workspace requests", async () => {
    const untrusted = createAdapter(false);
    await expect(untrusted.adapter.request("getWorkspace")).rejects.toMatchObject({
      code: "workspace_untrusted",
    });

    const { adapter } = createAdapter();
    await expect(
      adapter.request("readFile", { uri: "file:///outside.txt" }),
    ).rejects.toMatchObject({ code: "outside_workspace" });
  });

  it("opens a native VS Code diff from transient Extension Host content", async () => {
    const { adapter, api, createReviewUri } = createAdapter();
    await adapter.request("openDiff", {
      title: "main.ts",
      originalText: "const a = 1;",
      modifiedText: "const a = 2;",
    });

    expect(createReviewUri).toHaveBeenCalledTimes(2);
    expect(api.commands.executeCommand).toHaveBeenCalledWith(
      "vscode.diff",
      expect.objectContaining({ path: "/review/main.ts-original" }),
      expect.objectContaining({ path: "/review/main.ts-modified" }),
      "main.ts",
    );
  });

  it("opens allowed external URLs via vscode.env.openExternal", async () => {
    const { adapter, api } = createAdapter();
    await adapter.request("openExternal", { href: "https://example.com/docs" });
    expect(api.env.openExternal).toHaveBeenCalledWith(
      expect.objectContaining({ scheme: "https" }),
    );
    await expect(
      adapter.request("openExternal", { href: "file:///workspace/a.ts" }),
    ).rejects.toMatchObject({ code: "invalid_uri" });
  });

  it("reveals workspace roots in the Explorer", async () => {
    const { adapter, api } = createAdapter();
    await adapter.request("revealInExplorer", { uri: "file:///workspace" });
    expect(api.commands.executeCommand).toHaveBeenCalledWith(
      "revealInExplorer",
      expect.objectContaining({ path: "/workspace" }),
    );
  });

  it("returns the only folder without a QuickPick", async () => {
    const { adapter, api } = createAdapter();
    await expect(adapter.request("pickWorkspaceFolder", {})).resolves.toEqual({
      uri: "file:///workspace",
    });
    expect(api.window.showQuickPick).not.toHaveBeenCalled();
  });

  it("picks a multi-root folder via QuickPick", async () => {
    const { adapter, api } = createAdapter();
    const second = uri("/workspace/pkg");
    api.workspace.workspaceFolders = [
      { uri: uri("/workspace"), name: "workspace" },
      { uri: second, name: "pkg" },
    ] as never;
    api.window.showQuickPick = vi.fn(async (items: Array<{ uri: string }>) => items[1]);
    await expect(adapter.request("pickWorkspaceFolder", {})).resolves.toEqual({
      uri: "file:///workspace/pkg",
    });
    expect(api.window.showQuickPick).toHaveBeenCalled();
  });

  it("runs allowlisted recovery commands without workspace trust", async () => {
    const { adapter, api } = createAdapter(false);
    await expect(
      adapter.request("executeAltaiCommand", { command: "altai.openLogs" }),
    ).resolves.toEqual({ ok: true });
    expect(api.commands.executeCommand).toHaveBeenCalledWith("altai.openLogs");
    await expect(
      adapter.request("executeAltaiCommand", {
        command: "workbench.action.quit",
      }),
    ).rejects.toMatchObject({ code: "command_not_allowed" });
  });
});
