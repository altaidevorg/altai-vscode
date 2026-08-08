/**
 * Map extension preference snippets into the composer catalog shape.
 * Shared mapping lives in `@altai/agent-ui` (A6.91); host keeps DEFAULT_SNIPPETS.
 */

import type { SnippetPref } from "../shared/extensionPreferences.js";
import type { Snippet } from "./composerSnippets.js";
import { DEFAULT_SNIPPETS } from "./composerSnippets.js";
import {
  mergeSnippetCatalogFromPrefs,
  prefsToComposerSnippets as packagePrefsToComposerSnippets,
} from "@altai/agent-ui";

export function prefsToComposerSnippets(prefs: SnippetPref[]): Snippet[] {
  return packagePrefsToComposerSnippets(prefs);
}

/** Built-ins first; user snippets override same handle. */
export function mergeSnippetCatalog(user: SnippetPref[]): Snippet[] {
  return mergeSnippetCatalogFromPrefs(DEFAULT_SNIPPETS, user);
}
