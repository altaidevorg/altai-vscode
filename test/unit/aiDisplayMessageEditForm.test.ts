import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiDisplayMessageEditForm } from "../../src/webview/aiDisplayMessageEditForm.js";

describe("AiDisplayMessageEditForm re-export", () => {
  it("renders form chrome", () => {
    const html = renderToStaticMarkup(
      createElement(AiDisplayMessageEditForm, {
        value: "x",
        onChange: vi.fn(),
        onCancel: vi.fn(),
        onSave: vi.fn(),
      }),
    );
    expect(html).toContain("x");
    expect(html).toContain("Cancel");
  });
});
