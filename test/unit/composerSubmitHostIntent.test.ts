import { describe, expect, it } from "vitest";
import { mapComposerSubmitPlanToHostIntent } from "../../src/webview/composerSubmitHostIntent.js";

describe("mapComposerSubmitPlanToHostIntent re-export", () => {
  it("maps submit-send to a host send intent", () => {
    const intent = mapComposerSubmitPlanToHostIntent(
      {
        kind: "submit",
        action: "send",
        composed: "hi",
        multimodal: { imageUrls: [], documents: [] },
        clearDraftOnAccept: true,
      },
      { sessionId: "s", runId: null },
    );
    expect(intent.kind).toBe("send");
    if (intent.kind === "send") {
      expect(intent.queue).toBe(false);
      expect(intent.composed).toBe("hi");
    }
  });

  it("requires runId for steer", () => {
    expect(
      mapComposerSubmitPlanToHostIntent(
        {
          kind: "submit",
          action: "steer",
          composed: "nudge",
          multimodal: { imageUrls: [], documents: [] },
          clearDraftOnAccept: true,
        },
        { sessionId: "s", runId: null },
      ).kind,
    ).toBe("noop");
  });
});
