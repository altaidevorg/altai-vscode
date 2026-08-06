import { describe, expect, it } from "vitest";
import { COMPATIBILITY } from "../../src/extension/compatibility.js";

describe("COMPATIBILITY", () => {
  it("pins protocol major 1 for foundation", () => {
    expect(COMPATIBILITY.protocol).toBe(1);
    expect(COMPATIBILITY.extension).toMatch(/^\d+\.\d+\.\d+$/);
    expect(COMPATIBILITY.agentUi).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
