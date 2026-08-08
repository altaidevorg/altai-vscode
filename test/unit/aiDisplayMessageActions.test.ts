import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiDisplayMessageActions } from "../../src/webview/aiDisplayMessageActions.js";

describe("AiDisplayMessageActions re-export", () => {
  it("gates action slots", () => {
    const html = renderToStaticMarkup(
      createElement(AiDisplayMessageActions, {
        flags: {
          showCopy: true,
          showEdit: false,
          showRetry: false,
          showOpenFile: false,
          showOpenDiff: false,
        },
        copy: createElement("span", null, "Copy"),
      }),
    );
    expect(html).toContain("Copy");
  });
});
