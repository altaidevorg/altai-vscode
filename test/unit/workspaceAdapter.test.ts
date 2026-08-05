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
        candidate.path.startsWith("/workspace/") ? { uri: root } : undefined,
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
    },
    Uri: {
      parse: vi.fn((value: string) => {
        if (value === source.toString()) {
          return source;
        }
        if (value === "file:///outside.txt") {
          return uri("/outside.txt");
        }
        throw new Error("bad URI");
      }),
    },
    Selection: class {},
    TextEditorRevealType: { InCenterIfOutsideViewport: 0 },
    commands: { executeCommand },
  };
  return {
    adapter: new WorkspaceAdapter(
      api as never,
      () => isTrusted,
      createReviewUri as never,
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
});
