import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiAssistantRunActions } from "../../src/webview/aiAssistantRunActions.js";

describe("AiAssistantRunActions re-export", () => {
  it("renders stop while streaming", () => {
    const html = renderToStaticMarkup(
      createElement(AiAssistantRunActions, {
        streaming: true,
        renderStop: () => createElement("span", null, "Stop"),
        renderRetry: () => createElement("span", null, "Retry"),
      }),
    );
    expect(html).toContain("Stop");
  });
});
