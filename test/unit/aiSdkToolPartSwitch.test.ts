import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiSdkToolPartSwitch } from "../../src/webview/aiSdkToolPartSwitch.js";

describe("AiSdkToolPartSwitch re-export", () => {
  it("routes card views", () => {
    const html = renderToStaticMarkup(
      createElement(AiSdkToolPartSwitch, {
        part: { type: "tool-read", state: "output-available" },
        renderApproval: () => null,
        renderCard: (v) => createElement("span", null, v.toolName),
      }),
    );
    expect(html).toContain("read");
  });
});
