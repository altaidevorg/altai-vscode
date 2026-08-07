import { describe, expect, it } from "vitest";
import { mergeSnippetCatalog } from "../../src/webview/settingsSnippetsChrome.js";

describe("mergeSnippetCatalog", () => {
  it("keeps built-ins when no user snippets", () => {
    const catalog = mergeSnippetCatalog([]);
    expect(catalog.some((s) => s.handle.length > 0)).toBe(true);
  });

  it("lets user snippets win on matching handle", () => {
    const first = mergeSnippetCatalog([])[0];
    if (!first) {
      throw new Error("expected default snippets");
    }
    const merged = mergeSnippetCatalog([
      {
        id: "user-1",
        handle: first.handle,
        body: "custom body from settings",
      },
    ]);
    const hit = merged.find((s) => s.handle === first.handle);
    expect(hit?.content).toBe("custom body from settings");
    expect(hit?.id).toBe("user-1");
  });
});
