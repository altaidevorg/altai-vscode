import { describe, expect, it } from "vitest";
import { formatGitDiffSummary } from "../../src/shared/gitDiffSummary.js";

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
