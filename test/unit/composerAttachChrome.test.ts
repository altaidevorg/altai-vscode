import { describe, expect, it } from "vitest";
import {
  formatGitDiffSummary,
  formatTerminalAttachText,
  buildDiffContextItem,
  buildFileContextItem,
  buildSelectionContextItem,
  buildTerminalContextItem,
} from "../../src/webview/composerAttachChrome.js";

describe("formatGitDiffSummary", () => {
  it("renders branch and status lines", () => {
    expect(
      formatGitDiffSummary({
        branch: "main",
        files: [
          { path: "src/a.ts", status: "working-tree:5" },
          { path: "src/b.ts", status: "index:1" },
        ],
      }),
    ).toBe(
      [
        "Working tree changes on main:",
        "- working-tree:5  src/a.ts",
        "- index:1  src/b.ts",
      ].join("\n"),
    );
  });

  it("returns null for empty file lists", () => {
    expect(formatGitDiffSummary({ files: [] })).toBeNull();
  });
});

describe("formatTerminalAttachText", () => {
  it("prefers selection, then command, then cwd", () => {
    expect(
      formatTerminalAttachText({
        selectedText: " ls ",
        lastCommand: "npm test",
        cwd: "/ws",
      }),
    ).toBe("ls");
    expect(
      formatTerminalAttachText({
        lastCommand: "npm test",
        cwd: "/ws",
      }),
    ).toBe("npm test");
    expect(formatTerminalAttachText({ cwd: "/ws" })).toBe(
      "Active terminal cwd: /ws",
    );
    expect(formatTerminalAttachText({})).toBeNull();
  });
});

describe("buildDiffContextItem", () => {
  it("builds from patch", () => {
    const item = buildDiffContextItem({
      branch: "feat",
      patch: "diff --git a/a b/a\n",
    });
    expect(item?.kind).toBe("diff");
    expect(item?.name).toBe("diff · feat");
    expect(item?.text).toContain("diff --git");
  });

  it("falls back to file status summary", () => {
    const item = buildDiffContextItem({
      files: [{ path: "x.ts", status: "M" }],
    });
    expect(item?.kind).toBe("diff");
    expect(item?.text).toContain("x.ts");
  });

  it("returns null without content", () => {
    expect(buildDiffContextItem(null)).toBeNull();
    expect(buildDiffContextItem({ files: [] })).toBeNull();
  });
});

describe("buildTerminalContextItem", () => {
  it("builds from cwd", () => {
    const item = buildTerminalContextItem({ cwd: "/proj/app" });
    expect(item?.kind).toBe("terminal");
    expect(item?.name).toBe("app");
    expect(item?.text).toContain("/proj/app");
  });

  it("returns null without context", () => {
    expect(buildTerminalContextItem({})).toBeNull();
  });
});

describe("buildFileContextItem", () => {
  it("builds from uri and path", () => {
    const item = buildFileContextItem({
      uri: "file:///ws/src/a.ts",
      path: "/ws/src/a.ts",
    });
    expect(item?.kind).toBe("file");
    expect(item?.name).toBe("a.ts");
  });

  it("returns null without path", () => {
    expect(buildFileContextItem({ uri: "file:///x", path: "" })).toBeNull();
  });
});

describe("buildSelectionContextItem", () => {
  it("builds from selection text", () => {
    const item = buildSelectionContextItem({
      uri: "file:///ws/a.ts",
      path: "/ws/a.ts",
      text: "const x = 1",
    });
    expect(item?.kind).toBe("selection");
    expect(item?.lines).toBe(1);
  });

  it("returns null for blank text", () => {
    expect(
      buildSelectionContextItem({
        uri: "file:///ws/a.ts",
        path: "/ws/a.ts",
        text: "  ",
      }),
    ).toBeNull();
  });
});
