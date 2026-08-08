/**
 * Cross-runtime secure bytes (Extension Host Node + Webview).
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.127). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export function getSecureRandomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error("length must be positive");
  }
  const bytes = new Uint8Array(length);
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
    throw new Error("Secure Web Crypto API is unavailable");
  }
  cryptoApi.getRandomValues(bytes);
  return bytes;
}

export function createSecureId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  const bytes = getSecureRandomBytes(16);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return `${prefix}-${hex}`;
}
