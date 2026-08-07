import { describe, expect, it } from "vitest";
import { formatProblemsContextText } from "../../src/shared/problemsContext.js";

describe("formatProblemsContextText", () => {
  it("returns null without diagnostics", () => {
    expect(formatProblemsContextText("a.ts", [])).toBeNull();
  });

  it("formats severity, range, and message", () => {
    const text = formatProblemsContextText("src/a.ts", [
      {
        severity: 0,
        message: "Cannot find name x",
        startLine: 2,
        startCharacter: 0,
        endLine: 2,
        endCharacter: 1,
        source: "ts",
      },
    ]);
    expect(text).toContain("Problems in src/a.ts");
    expect(text).toContain("Error");
    expect(text).toContain("L3:1");
    expect(text).toContain("Cannot find name x");
    expect(text).toContain("[ts]");
  });
});
