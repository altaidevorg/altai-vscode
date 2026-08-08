import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiComposerFollowupControl } from "../../src/webview/aiComposerFollowupControl.js";

describe("AiComposerFollowupControl re-export", () => {
  it("returns null without active run", () => {
    const html = renderToStaticMarkup(
      createElement(AiComposerFollowupControl, {
        hasActiveRun: false,
        hasPrompt: true,
        canSteer: true,
        canQueue: true,
        onSteer: vi.fn(),
        onQueue: vi.fn(),
      }),
    );
    expect(html).toBe("");
  });
});
