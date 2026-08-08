import { describe, expect, it } from "vitest";
import { mapSdkUiPartView } from "../../src/webview/sdkUiPartView.js";

describe("sdkUiPartView re-export", () => {
  it("maps text parts", () => {
    expect(mapSdkUiPartView({ type: "text", text: "ok" })).toEqual({
      kind: "text",
      text: "ok",
    });
  });
});
