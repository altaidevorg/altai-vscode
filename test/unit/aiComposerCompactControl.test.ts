import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiComposerCompactControl } from "../../src/webview/aiComposerCompactControl.js";

describe("AiComposerCompactControl re-export", () => {
  it("returns null without capability", () => {
    const html = renderToStaticMarkup(
      createElement(AiComposerCompactControl, {
        canCompact: false,
        hasActiveChat: true,
        onCompact: vi.fn(),
      }),
    );
    expect(html).toBe("");
  });
});
