/**
 * Append a cache-bust query so Extension Host reloads fresh webview assets
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.126). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */
export function withAssetCacheBust(
  uriString: string,
  bust: string | number,
): string {
  const value = String(bust).trim();
  if (!value || !uriString) {
    return uriString;
  }
  const sep = uriString.includes("?") ? "&" : "?";
  return `${uriString}${sep}v=${encodeURIComponent(value)}`;
}
