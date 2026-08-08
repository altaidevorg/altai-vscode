import { describe, expect, it } from "vitest";
import {
  applyComposerSlashOutcome,
  buildComposerCommandSource,
  classifyBrowserFile,
} from "../../src/webview/composerDraft.js";

describe("composerDraft re-exports", () => {
  it("builds command source and maps slash outcomes", () => {
    expect(buildComposerCommandSource("hello", ["init"])).toBe("#init hello");
    const mapped = applyComposerSlashOutcome(
      { kind: "send-prompt", prompt: "body", commandName: "init" },
      "x",
    );
    expect(mapped.commandMarker).toContain('name="init"');
    expect(mapped.effectiveText).toBe("body");
  });

  it("classifies browser files", () => {
    expect(
      classifyBrowserFile({
        name: "a.png",
        type: "image/png",
        size: 10,
        lastModified: 1,
      }).ok,
    ).toBe(true);
  });
});
