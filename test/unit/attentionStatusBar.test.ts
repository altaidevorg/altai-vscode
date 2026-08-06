import { describe, expect, it } from "vitest";
import {
  attentionStatusBarCommand,
  parseAttentionReportParams,
} from "../../src/shared/attention.js";

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

describe("attentionStatusBarCommand", () => {
  it("routes to inbox when there is attention", () => {
    expect(attentionStatusBarCommand(0)).toBe("altai.openOperations");
    expect(attentionStatusBarCommand(1)).toBe("altai.openOperationsInbox");
    expect(attentionStatusBarCommand(3.2)).toBe("altai.openOperationsInbox");
  });
});
