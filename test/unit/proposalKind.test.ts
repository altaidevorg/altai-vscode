import { describe, expect, it } from "vitest";
import { proposalKindFromPlanEdit } from "../../src/webview/proposalKind.js";

describe("proposalKind re-export (A6.147)", () => {
  it("maps create_file when new", () => {
    expect(proposalKindFromPlanEdit("edit", true)).toBe("create_file");
  });
});
