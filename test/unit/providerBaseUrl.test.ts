import { describe, expect, it } from "vitest";
import {
  normalizeProviderBaseUrl,
  providerRequiresBaseUrl,
} from "../../src/shared/providerBaseUrl.js";

describe("provider base URL helpers", () => {
  it("detects openai-compatible requirement", () => {
    expect(providerRequiresBaseUrl("openai-compatible")).toBe(true);
    expect(providerRequiresBaseUrl("openai")).toBe(false);
  });

  it("accepts http(s) urls within length", () => {
    expect(normalizeProviderBaseUrl(" https://api.example.com/v1 ")).toBe(
      "https://api.example.com/v1",
    );
    expect(normalizeProviderBaseUrl("http://localhost:8787")).toBe(
      "http://localhost:8787",
    );
  });

  it("rejects invalid urls", () => {
    expect(normalizeProviderBaseUrl("")).toBeNull();
    expect(normalizeProviderBaseUrl("ftp://x")).toBeNull();
    expect(normalizeProviderBaseUrl("notaurl")).toBeNull();
    expect(normalizeProviderBaseUrl("x".repeat(3000))).toBeNull();
  });
});
