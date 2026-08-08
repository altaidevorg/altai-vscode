import { describe, expect, it } from "vitest";
import {
  composerAvailabilityForFollowupMode,
  contextItemsToComposerDraftFiles,
  followupModeToComposerAction,
} from "../../src/webview/vscodeComposerSubmit.js";
import type { ComposerContextItem } from "../../src/webview/composerContext.js";

describe("vscodeComposerSubmit helpers", () => {
  it("maps follow-up modes to composer actions", () => {
    expect(followupModeToComposerAction("start")).toBe("send");
    expect(followupModeToComposerAction("steer")).toBe("steer");
    expect(followupModeToComposerAction("queue")).toBe("queue");
  });

  it("builds availability that unlocks the resolved mode", () => {
    const start = composerAvailabilityForFollowupMode("start", {
      hasDraft: true,
      runId: null,
    });
    expect(start.canSend).toBe(true);
    expect(start.canSteer).toBe(false);

    const steer = composerAvailabilityForFollowupMode("steer", {
      hasDraft: true,
      runId: "r1",
    });
    expect(steer.canSteer).toBe(true);

    const queue = composerAvailabilityForFollowupMode("queue", {
      hasDraft: true,
      runId: "r1",
    });
    expect(queue.canQueue).toBe(true);
  });

  it("maps text context into draft files and skips URI-only files", () => {
    const items: ComposerContextItem[] = [
      {
        id: "f1",
        kind: "file",
        uri: "file:///a.ts",
        name: "a.ts",
        path: "/a.ts",
      },
      {
        id: "s1",
        kind: "selection",
        path: "/a.ts",
        text: "const x = 1",
        lines: 1,
      },
    ];
    const files = contextItemsToComposerDraftFiles(items);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      id: "s1",
      kind: "selection",
      text: "const x = 1",
      source: "editor",
    });
  });
});
