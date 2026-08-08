/**
 * Pure helpers for Extension Host preferred multi-root workspace URI memento.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.115). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export const PREFERRED_HOST_ROOT_STATE_KEY = "altai.preferredHostRootUri";

/**
 * Keep preferred URI only when it still matches an open workspace folder string.
 */
export function retainPreferredHostRootUri(
  preferredUri: string | undefined,
  openRootUris: readonly string[],
): string | undefined {
  if (!preferredUri) {
    return undefined;
  }
  const normalized = preferredUri.trim();
  if (!normalized) {
    return undefined;
  }
  return openRootUris.includes(normalized) ? normalized : undefined;
}

export function readPreferredHostRootFromState(
  state: { get: (key: string) => unknown },
  openRootUris: readonly string[],
): string | undefined {
  const raw = state.get(PREFERRED_HOST_ROOT_STATE_KEY);
  if (typeof raw !== "string") {
    return undefined;
  }
  return retainPreferredHostRootUri(raw, openRootUris);
}
