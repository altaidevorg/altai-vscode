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
  const setPreferredTargetUri = vi.fn();
  const persistPreferred = vi.fn();
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
      activeTerminal: undefined as
        | {
            name: string;
            creationOptions: Record<string, unknown>;
            shellIntegration?: { cwd?: string | FakeUri };
          }
        | undefined,
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
      undefined,
      {
        setPreferredTargetUri,
      } as never,
      undefined,
      persistPreferred,
    ),
    api,
    createReviewUri,
    setPreferredTargetUri,
    persistPreferred,
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

  it("mirrors preferred project root to GitDiffAdapter", async () => {
    const { adapter, setPreferredTargetUri, persistPreferred } = createAdapter();
    await expect(
      adapter.request("setPreferredRootUri", { uri: "file:///workspace" }),
    ).resolves.toEqual({ ok: true });
    expect(setPreferredTargetUri).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/workspace" }),
    );
    expect(adapter.getPreferredHostRootFsPath()).toBe("/workspace");
    expect(persistPreferred).toHaveBeenCalledWith("file:///workspace");
    await expect(adapter.request("setPreferredRootUri", { uri: "" })).resolves.toEqual({
      ok: true,
    });
    expect(setPreferredTargetUri).toHaveBeenLastCalledWith(undefined);
    expect(adapter.getPreferredHostRootFsPath()).toBeUndefined();
    expect(persistPreferred).toHaveBeenLastCalledWith(undefined);
  });

  it("restores preferred host root without clobbering on stale URI", async () => {
    const { adapter } = createAdapter();
    adapter.restorePreferredHostRootUri("file:///workspace");
    expect(adapter.getPreferredHostRootFsPath()).toBe("/workspace");
    adapter.restorePreferredHostRootUri("file:///outside.txt");
    expect(adapter.getPreferredHostRootFsPath()).toBe("/workspace");
  });

  it("reports preferred root as workspace currentDir", async () => {
    const { adapter } = createAdapter();
    adapter.restorePreferredHostRootUri("file:///workspace");
    await expect(adapter.request("getWorkspace")).resolves.toMatchObject({
      currentDir: "/workspace",
    });
  });

  it("rejects preferred roots outside open folders", async () => {
    const { adapter } = createAdapter();
    await expect(
      adapter.request("setPreferredRootUri", { uri: "file:///outside.txt" }),
    ).rejects.toMatchObject({ code: "outside_workspace" });
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
    await expect(
      adapter.request("executeAltaiCommand", {
        command: "workbench.action.manageWorkspaceTrust",
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      adapter.request("executeAltaiCommand", {
        command: "altai.showVersionCompatibility",
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      adapter.request("executeAltaiCommand", {
        command: "altai.connectProvider",
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      adapter.request("executeAltaiCommand", {
        command: "altai.clearProviderCredential",
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      adapter.request("executeAltaiCommand", {
        command: "altai.openWalkthrough",
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("returns terminal cwd when available, otherwise a named fallback", async () => {
    const { adapter, api } = createAdapter();
    await expect(adapter.request("getTerminalContext")).resolves.toBeNull();

    api.window.activeTerminal = {
      name: "zsh",
      creationOptions: {},
    };
    await expect(adapter.request("getTerminalContext")).resolves.toEqual({
      lastCommand: "Active terminal: zsh",
    });

    api.window.activeTerminal = {
      name: "bash",
      creationOptions: { cwd: "/workspace" },
    };
    await expect(adapter.request("getTerminalContext")).resolves.toEqual({
      cwd: "/workspace",
    });
  });

  it("prefers an explicit terminal and last-command from tracker", async () => {
    const preferred = {
      name: "side",
      creationOptions: { cwd: "/preferred" },
    };
    const tracker = {
      getTerminal: () => preferred,
      getLastCommand: () => "npm test",
      setPreferredTerminal: vi.fn(),
    };
    const adapter = new WorkspaceAdapter(
      {
        workspace: {
          isTrusted: true,
          workspaceFolders: [{ uri: uri("/workspace") }],
          getWorkspaceFolder: () => ({ uri: uri("/workspace") }),
        },
        window: {
          activeTerminal: {
            name: "main",
            creationOptions: { cwd: "/main" },
          },
        },
        commands: { executeCommand: vi.fn() },
      } as never,
      () => true,
      () => uri("/review/x") as never,
      async () => null,
      tracker as never,
    );
    await expect(adapter.request("getTerminalContext")).resolves.toEqual({
      cwd: "/preferred",
      lastCommand: "npm test",
    });
  });
});
