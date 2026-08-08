import { describe, expect, it } from "vitest";
import { clearComposerDraftAfterAccept } from "../../src/webview/composerDraftClear.js";

describe("clearComposerDraftAfterAccept re-export", () => {
  it("clears an unchanged accepted draft", () => {
    const accepted = {
      valueRevision: 1,
      value: "hello",
      files: [],
      snippets: [],
      commands: [],
    };
    expect(clearComposerDraftAfterAccept(accepted, accepted)).toEqual({
      value: "",
      files: [],
      snippets: [],
      commands: [],
    });
  });

  it("keeps residual typed text when revision advanced", () => {
    const accepted = {
      valueRevision: 1,
      value: "hello",
      files: [],
      snippets: [],
      commands: [],
    };
    const current = {
      valueRevision: 2,
      value: "hello more",
      files: [],
      snippets: [],
      commands: [],
    };
    expect(clearComposerDraftAfterAccept(current, accepted).value).toBe("more");
  });
});
