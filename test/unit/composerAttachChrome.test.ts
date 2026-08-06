import { describe, expect, it } from "vitest";
import {
  formatGitDiffSummary,
  formatTerminalAttachText,
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
