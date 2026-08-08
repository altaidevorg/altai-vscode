import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiDisplayMessageBodyExtras } from "../../src/webview/aiDisplayMessageBodyExtras.js";

describe("AiDisplayMessageBodyExtras re-export", () => {
  it("wraps children", () => {
    const html = renderToStaticMarkup(
      createElement(AiDisplayMessageBodyExtras, {
        children: createElement("span", null, "body"),
      }),
    );
    expect(html).toContain("body");
  });
});
