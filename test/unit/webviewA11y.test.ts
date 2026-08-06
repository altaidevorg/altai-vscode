import { describe, expect, it } from "vitest";
import { buildWebviewHtmlDocument } from "../../src/extension/webview/webviewHtmlDocument.js";

describe("webview HTML accessibility shell", () => {
  const html = buildWebviewHtmlDocument({
    cspSource: "https://webview.example",
    scriptSrc: "https://webview.example/main.js",
    styleSrc: "https://webview.example/main.css",
    nonce: "testnonce",
  });

  it("declares language and CSP", () => {
    expect(html).toContain('lang="en"');
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-testnonce'");
  });

  it("mounts a main landmark root and reduced-motion friendly shell", () => {
    expect(html).toMatch(/id="root"/);
    expect(html).toMatch(/role="main"/);
    expect(html).toContain("prefers-reduced-motion");
  });

  it("does not open connect-src to the public internet", () => {
    expect(html).toContain("connect-src 'none'");
  });
});
