import { createSecureId } from "./secureRandom.js";

/**
 * Opaque message / request identifiers for Webview envelopes.
 */
export function createMessageId(prefix = "msg"): string {
  return createSecureId(prefix);
}
