import { getSecureRandomBytes } from "./secureRandom.js";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * CSP nonce using cryptographically secure randomness (Web Crypto).
 */
export function createNonce(length = 32): string {
  const bytes = getSecureRandomBytes(length);
  let nonce = "";
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i];
    if (byte === undefined) {
      throw new Error("Failed to generate secure nonce bytes");
    }
    nonce += ALPHABET.charAt(byte % ALPHABET.length);
  }
  return nonce;
}
