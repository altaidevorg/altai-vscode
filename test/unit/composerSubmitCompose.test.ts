import { describe, expect, it } from "vitest";
import { composeComposerSubmitText } from "../../src/webview/composerSubmitCompose.js";

describe("composerSubmitCompose re-export", () => {
  it("composes desktop markers via the package helper", () => {
    const text = composeComposerSubmitText({
      effectiveText: "hi #pr",
      catalog: [
        {
          id: "1",
          handle: "pr",
          name: "PR",
          description: "",
          content: "review",
        },
      ],
      files: [
        {
          kind: "terminal",
          name: "shell",
          mediaType: "text/plain",
          text: "out",
        },
      ],
    });
    expect(text).toContain("<snippet name=\"pr\">");
    expect(text).toContain("<terminal-context");
    expect(text).toContain("hi");
  });
});
