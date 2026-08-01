import { describe, expect, it } from "vitest";
import { createNonce } from "../../src/shared/nonce.js";

describe("createNonce", () => {
  it("returns a 32-character alphanumeric nonce", () => {
    const nonce = createNonce();
    expect(nonce).toHaveLength(32);
    expect(nonce).toMatch(/^[A-Za-z0-9]+$/);
  });
});
