import { createSecureId } from "./secureRandom.js";

/**
 * Opaque message / request identifiers for Webview envelopes.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.129). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */
/**
 * Opaque message / request identifiers for Webview envelopes.
 */
export function createMessageId(prefix = "msg"): string {
  return createSecureId(prefix);
}
