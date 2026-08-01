import { describe, expect, it } from "vitest";
import { createNonce } from "../../src/shared/nonce.js";
import { createSecureId } from "../../src/shared/secureRandom.js";

describe("createNonce", () => {
  it("returns the requested alphabet length", () => {
    const nonce = createNonce(32);
    expect(nonce).toHaveLength(32);
    expect(nonce).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("produces distinct values across calls", () => {
    const samples = new Set(Array.from({ length: 20 }, () => createNonce(32)));
    expect(samples.size).toBe(20);
  });
});

describe("createSecureId", () => {
  it("prefixes a UUID-like id", () => {
    const id = createSecureId("evt");
    expect(id.startsWith("evt-")).toBe(true);
    expect(id.length).toBeGreaterThan("evt-".length + 8);
  });

  it("avoids collisions across rapid calls", () => {
    const samples = new Set(
      Array.from({ length: 50 }, () => createSecureId("req")),
    );
    expect(samples.size).toBe(50);
  });
});
