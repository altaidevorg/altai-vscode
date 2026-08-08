import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AiDisplayMessageBubble,
  displayMessageElementId,
} from "../../src/webview/aiDisplayMessageBubble.js";

describe("AiDisplayMessageBubble re-export", () => {
  it("builds bubble markup", () => {
    const html = renderToStaticMarkup(
      createElement(AiDisplayMessageBubble, {
        messageId: "x",
        role: "assistant",
        body: createElement("span", null, "ok"),
      }),
    );
    expect(html).toContain(displayMessageElementId("x"));
    expect(html).toContain("ALTAI");
  });
});
