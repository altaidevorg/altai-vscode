import { describe, expect, it } from "vitest";
import { redactSensitive } from "../../src/webview/redactSensitive.js";

describe("redactSensitive re-export (A6.149)", () => {
  it("redacts openai-like keys", () => {
    expect(redactSensitive("sk-abcdefghijklmnopqrstuvwxyz1234")).toContain(
      "REDACTED",
    );
  });
});
