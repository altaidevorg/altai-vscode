import { describe, expect, it } from "vitest";
import {
  mapSdkToolApprovalPart,
  sdkToolName,
} from "../../src/webview/sdkToolPartMap.js";

describe("sdkToolPartMap re-export", () => {
  it("maps tool names and approvals", () => {
    expect(sdkToolName({ type: "tool-exec" })).toBe("exec");
    expect(
      mapSdkToolApprovalPart({
        type: "tool-exec",
        state: "approval-requested",
        approval: { id: "x" },
      })?.approvalId,
    ).toBe("x");
  });
});
