import { describe, expect, it } from "vitest";
import { parseAttentionReportParams } from "../../src/shared/attention.js";

describe("parseAttentionReportParams", () => {
  it("accepts non-negative finite counts", () => {
    expect(parseAttentionReportParams({ count: 0 })).toBe(0);
    expect(parseAttentionReportParams({ count: 3.9 })).toBe(3);
    expect(parseAttentionReportParams({ count: 12 })).toBe(12);
  });

  it("rejects malformed payloads", () => {
    expect(parseAttentionReportParams(null)).toBeNull();
    expect(parseAttentionReportParams({ count: -1 })).toBeNull();
    expect(parseAttentionReportParams({ count: "2" })).toBeNull();
    expect(parseAttentionReportParams({})).toBeNull();
  });
});
