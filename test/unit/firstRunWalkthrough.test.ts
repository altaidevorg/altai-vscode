import { describe, expect, it, vi } from "vitest";
import {
  FIRST_RUN_WALKTHROUGH_STATE_KEY,
  markFirstRunWalkthroughOffered,
  shouldOfferFirstRunWalkthrough,
} from "../../src/shared/firstRunWalkthrough.js";

describe("shouldOfferFirstRunWalkthrough", () => {
  it("offers once when enabled and unmarked", () => {
    expect(
      shouldOfferFirstRunWalkthrough({ get: () => undefined }, true),
    ).toBe(true);
    expect(
      shouldOfferFirstRunWalkthrough(
        { get: (key) => (key === FIRST_RUN_WALKTHROUGH_STATE_KEY ? true : undefined) },
        true,
      ),
    ).toBe(false);
  });

  it("respects the open-on-install setting", () => {
    expect(
      shouldOfferFirstRunWalkthrough({ get: () => undefined }, false),
    ).toBe(false);
  });
});

describe("markFirstRunWalkthroughOffered", () => {
  it("writes the globalState marker", async () => {
    const update = vi.fn(async () => undefined);
    await markFirstRunWalkthroughOffered({
      get: () => undefined,
      update,
    });
    expect(update).toHaveBeenCalledWith(FIRST_RUN_WALKTHROUGH_STATE_KEY, true);
  });
});
