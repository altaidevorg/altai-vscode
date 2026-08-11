import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { COMPATIBILITY } from "../../src/extension/compatibility.js";

describe("COMPATIBILITY", () => {
  it("pins protocol major 1 for foundation", () => {
    expect(COMPATIBILITY.protocol).toBe(1);
    expect(COMPATIBILITY.extension).toMatch(/^\d+\.\d+\.\d+$/);
    expect(COMPATIBILITY.agentUi).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("keeps the extension pin aligned with package.json", () => {
    const packageJson = JSON.parse(
      readFileSync("package.json", "utf8"),
    ) as { version: string };
    expect(COMPATIBILITY.extension).toBe(packageJson.version);
  });
});
