import { describe, expect, it } from "vitest";
import { useDisplayMessageInteractionState } from "../../src/webview/useDisplayMessageInteractionState.js";

describe("useDisplayMessageInteractionState re-export", () => {
  it("exports a hook", () => {
    expect(typeof useDisplayMessageInteractionState).toBe("function");
  });
});
