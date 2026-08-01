/**
 * Opaque message / request identifiers for Webview envelopes.
 */

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function createMessageId(prefix = "msg"): string {
  let suffix = "";
  for (let i = 0; i < 16; i += 1) {
    suffix += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return `${prefix}-${Date.now().toString(36)}-${suffix}`;
}
