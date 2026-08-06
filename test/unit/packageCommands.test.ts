import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("package.json command contributions", () => {
  it("exposes Open Settings and Ask About deep-link commands", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as {
      contributes?: {
        commands?: Array<{ command: string }>;
        keybindings?: Array<{ command: string }>;
      };
    };
    const commands = new Set(
      (manifest.contributes?.commands ?? []).map((entry) => entry.command),
    );
    for (const id of [
      "altai.openSidePanel",
      "altai.openSettings",
      "altai.askAboutSelection",
      "altai.askAboutActiveFile",
      "altai.askAboutWorkingTree",
    ]) {
      expect(commands.has(id), `missing command ${id}`).toBe(true);
    }
    const keybound = new Set(
      (manifest.contributes?.keybindings ?? []).map((entry) => entry.command),
    );
    expect(keybound.has("altai.openSettings")).toBe(true);
  });
});
