import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiDisplayMessageContent } from "../../src/webview/aiDisplayMessageContent.js";

describe("AiDisplayMessageContent re-export", () => {
  it("renders content", () => {
    const html = renderToStaticMarkup(
      createElement(AiDisplayMessageContent, { content: "hi" }),
    );
    expect(html).toContain("hi");
  });
});
