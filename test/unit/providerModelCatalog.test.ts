import { describe, expect, it } from "vitest";
import {
  mergeProviderCatalog,
  hasConnectedProvider,
  providerStatusCopy,
} from "../../src/webview/providerStatusChrome.js";
import { mergeModelCatalog } from "../../src/webview/modelCatalogChrome.js";

describe("mergeProviderCatalog", () => {
  it("surfaces the full known provider catalog even when host is empty", () => {
    const merged = mergeProviderCatalog([]);
    expect(merged.some((p) => p.providerId === "openai")).toBe(true);
    expect(merged.some((p) => p.providerId === "anthropic")).toBe(true);
    expect(merged.some((p) => p.providerId === "openrouter")).toBe(true);
    expect(hasConnectedProvider(merged)).toBe(false);
  });

  it("marks host-connected providers while keeping the rest", () => {
    const merged = mergeProviderCatalog([
      { providerId: "anthropic", connected: true, label: "Anthropic" },
    ]);
    expect(
      merged.find((p) => p.providerId === "anthropic")?.connected,
    ).toBe(true);
    expect(
      merged.find((p) => p.providerId === "openai")?.connected,
    ).toBe(false);
    expect(hasConnectedProvider(merged)).toBe(true);
    expect(
      providerStatusCopy({ providerId: "anthropic", connected: true }),
    ).toBe("API key saved");
  });
});

describe("mergeModelCatalog", () => {
  it("includes Studio catalog plus auto", () => {
    const catalog = mergeModelCatalog([]);
    expect(catalog.some((m) => m.id === "auto")).toBe(true);
    expect(catalog.some((m) => m.id === "claude-sonnet-4-6")).toBe(true);
    expect(catalog.some((m) => m.providerId === "openai")).toBe(true);
  });

  it("lets host entries override labels", () => {
    const catalog = mergeModelCatalog([
      {
        id: "claude-sonnet-4-6",
        label: "Custom Sonnet",
        providerId: "anthropic",
      },
    ]);
    expect(
      catalog.find((m) => m.id === "claude-sonnet-4-6")?.label,
    ).toBe("Custom Sonnet");
  });
});
