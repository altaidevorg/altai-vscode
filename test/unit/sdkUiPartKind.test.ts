import { describe, expect, it } from "vitest";
import { classifySdkUiPart, sdkPartText } from "../../src/webview/sdkUiPartKind.js";

describe("sdkUiPartKind re-export", () => {
  it("classifies and extracts text", () => {
    expect(classifySdkUiPart({ type: "text" })).toBe("text");
    expect(sdkPartText({ type: "text", text: "x" })).toBe("x");
  });
});
