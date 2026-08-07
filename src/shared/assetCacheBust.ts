/**
 * Append a cache-bust query so Extension Host reloads fresh webview assets
 * after rebuild (VS Code may otherwise keep a stale main.js).
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
