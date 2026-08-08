import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AiDisplayMessageBubble,
} from "../../src/webview/aiDisplayMessageBubble.js";
import { hasDisplayMessageActions } from "@altai/agent-ui";

describe("empty display actions footer guard", () => {
  it("skips footer when actions undefined", () => {
    const html = renderToStaticMarkup(
      createElement(AiDisplayMessageBubble, {
        messageId: "m",
        role: "assistant",
        body: createElement("span", null, "x"),
      }),
    );
    expect(html).not.toContain("altai-chat-bubble-actions");
  });

  it("hasDisplayMessageActions false for empty flags", () => {
    expect(
      hasDisplayMessageActions({
        showCopy: false,
        showEdit: false,
        showRetry: false,
        showOpenFile: false,
        showOpenDiff: false,
      }),
    ).toBe(false);
  });
});
