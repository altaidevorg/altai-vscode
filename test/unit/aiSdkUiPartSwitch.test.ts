import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiSdkUiPartSwitch } from "../../src/webview/aiSdkUiPartSwitch.js";

describe("AiSdkUiPartSwitch re-export", () => {
  it("routes text parts", () => {
    const html = renderToStaticMarkup(
      createElement(AiSdkUiPartSwitch, {
        part: { type: "text", text: "hi" },
        renderText: (t) => createElement("span", null, t),
        renderReasoning: () => null,
        renderTool: () => null,
      }),
    );
    expect(html).toContain("hi");
  });
});
