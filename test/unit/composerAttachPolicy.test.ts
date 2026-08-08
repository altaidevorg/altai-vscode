import { describe, expect, it } from "vitest";
import {
  canMountComposerAttachMenu,
  composerAttachSurfaceShowsToolbar,
} from "../../src/webview/composerAttachPolicy.js";

describe("composerAttachPolicy re-export", () => {
  it("gates attach mount", () => {
    expect(
      canMountComposerAttachMenu({
        canActiveFile: true,
        canSelection: false,
        canGitDiff: false,
        canTerminal: false,
      }),
    ).toBe(true);
    expect(composerAttachSurfaceShowsToolbar("attachments")).toBe(false);
  });
});
