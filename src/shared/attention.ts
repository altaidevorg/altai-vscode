/**
 * Attention report payloads Webview → Extension Host.
 * Pure — unit-testable without the vscode module.
 */

/** Runtime-validate Webview → Extension Host attention reports. */
export function parseAttentionReportParams(value: unknown): number | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const count = (value as { count?: unknown }).count;
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return null;
  }
  return Math.floor(count);
}
