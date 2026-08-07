/**
 * Pure policy for one-shot Getting Started walkthrough on first extension
 * activation in this environment (VS Code profile / globalState scope).
 */

export const FIRST_RUN_WALKTHROUGH_STATE_KEY =
  "altai.hasOfferedGettingStarted";

export type FirstRunStateReader = {
  get: (key: string) => unknown;
};

export type FirstRunStateWriter = FirstRunStateReader & {
  update: (key: string, value: boolean) => void | PromiseLike<void>;
};

/**
 * Offer once when setting is enabled and globalState has no marker.
 */
export function shouldOfferFirstRunWalkthrough(
  globalState: FirstRunStateReader,
  openOnInstall: boolean,
): boolean {
  if (!openOnInstall) {
    return false;
  }
  return globalState.get(FIRST_RUN_WALKTHROUGH_STATE_KEY) !== true;
}

export async function markFirstRunWalkthroughOffered(
  globalState: FirstRunStateWriter,
): Promise<void> {
  await globalState.update(FIRST_RUN_WALKTHROUGH_STATE_KEY, true);
}
