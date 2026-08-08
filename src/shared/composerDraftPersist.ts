/**
 * Debounce timing for presentation-only composer draft persistence.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.125). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

/** Delay between draft keystrokes and getState/setState write. */
export const COMPOSER_DRAFT_DEBOUNCE_MS = 200;

/**
 * Whether an immediate (non-debounced) flush is warranted for empty drafts
 * so reload does not resurrect deleted text after a partial debounce window.
 */
export function shouldPersistComposerDraftImmediately(draft: string): boolean {
  return draft.length === 0;
}
