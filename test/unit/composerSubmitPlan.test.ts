import { describe, expect, it } from "vitest";
import { getComposerActionAvailability } from "@altai/agent-ui";
import { planComposerSubmit } from "../../src/webview/composerSubmitPlan.js";

describe("planComposerSubmit re-export", () => {
  it("plans a plain send", () => {
    const availability = getComposerActionAvailability({
      status: "idle",
      hasDraft: true,
      hasNativeAttachment: false,
      runId: null,
      submitting: false,
    });
    const plan = planComposerSubmit({
      action: "send",
      availability,
      draft: {
        value: "hello",
        files: [],
        snippets: [],
        commands: [],
      },
      catalog: [],
    });
    expect(plan.kind).toBe("submit");
    if (plan.kind === "submit") {
      expect(plan.composed).toContain("hello");
    }
  });
});
