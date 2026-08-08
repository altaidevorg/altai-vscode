import { describe, expect, it, vi } from "vitest";
import { getComposerActionAvailability } from "@altai/agent-ui";
import { executeComposerSubmit } from "../../src/webview/composerSubmitExecute.js";

describe("executeComposerSubmit re-export", () => {
  it("sends through host handlers", async () => {
    const send = vi.fn().mockResolvedValue(true);
    const availability = getComposerActionAvailability({
      status: "idle",
      hasDraft: true,
      hasNativeAttachment: false,
      runId: null,
      submitting: false,
    });
    const result = await executeComposerSubmit({
      action: "send",
      availability,
      draft: { value: "hello", files: [], snippets: [], commands: [] },
      catalog: [],
      sessionId: "s",
      runId: null,
      host: { send, steer: vi.fn() },
    });
    expect(result.kind).toBe("accepted");
    expect(send).toHaveBeenCalled();
  });
});
