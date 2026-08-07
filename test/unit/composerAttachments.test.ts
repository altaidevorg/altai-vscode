import { describe, expect, it } from "vitest";
import {
  buildTextContextAttachment,
  estimateComposerContextTokens,
  hasComposerDraft,
  upsertComposerAttachment,
} from "../../src/webview/composerAttachments.js";

describe("composerAttachments re-exports", () => {
  it("builds and upserts text context", () => {
    const att = buildTextContextAttachment({
      kind: "terminal",
      name: "shell",
      text: "  ok  ",
    });
    expect(att?.kind).toBe("terminal");
    expect(att?.text).toBe("ok");
    const list = upsertComposerAttachment([], att!);
    expect(list).toHaveLength(1);
    expect(
      upsertComposerAttachment(list, { ...att!, text: "next" }),
    ).toHaveLength(1);
  });

  it("draft + token estimates", () => {
    expect(hasComposerDraft({ value: "", files: [] })).toBe(false);
    expect(hasComposerDraft({ value: "hi", files: [] })).toBe(true);
    expect(
      estimateComposerContextTokens({
        files: [{ kind: "text", text: "abcd" }],
        snippets: [{ content: "efgh" }],
      }),
    ).toBe(2);
  });
});
