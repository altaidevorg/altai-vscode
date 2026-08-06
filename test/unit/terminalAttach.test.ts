import { describe, expect, it } from "vitest";
import { formatTerminalAttachText } from "../../src/shared/terminalAttach.js";

describe("formatTerminalAttachText", () => {
  it("prefers selection, then command, then cwd", () => {
    expect(
      formatTerminalAttachText({
        selectedText: " ls ",
        lastCommand: "npm test",
        cwd: "/ws",
      }),
    ).toBe("ls");
    expect(
      formatTerminalAttachText({
        lastCommand: "npm test",
        cwd: "/ws",
      }),
    ).toBe("npm test");
    expect(formatTerminalAttachText({ cwd: "/ws" })).toBe(
      "Active terminal cwd: /ws",
    );
    expect(formatTerminalAttachText({})).toBeNull();
  });
});
