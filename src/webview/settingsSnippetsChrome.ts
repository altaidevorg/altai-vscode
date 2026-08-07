/**
 * Map extension preference snippets into the composer catalog shape.
 */

import type { SnippetPref } from "../shared/extensionPreferences.js";
import type { Snippet } from "./composerSnippets.js";
import { DEFAULT_SNIPPETS, normalizeHandle } from "./composerSnippets.js";

export function prefsToComposerSnippets(prefs: SnippetPref[]): Snippet[] {
  return prefs
    .map((pref) => {
      const handle = normalizeHandle(pref.handle);
      if (!handle) {
        return null;
      }
      return {
        id: pref.id || `pref-${handle}`,
        handle,
        name: `#${handle}`,
        description: "Custom snippet from Settings → Agents",
        content: pref.body,
      } satisfies Snippet;
    })
    .filter((item): item is Snippet => item !== null);
}

/** Built-ins first; user snippets override same handle. */
export function mergeSnippetCatalog(user: SnippetPref[]): Snippet[] {
  const custom = prefsToComposerSnippets(user);
  const byHandle = new Map<string, Snippet>();
  for (const snip of DEFAULT_SNIPPETS) {
    byHandle.set(snip.handle, snip);
  }
  for (const snip of custom) {
    byHandle.set(snip.handle, snip);
  }
  return [...byHandle.values()];
}
