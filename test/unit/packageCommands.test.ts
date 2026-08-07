import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function loadManifestCommands(): string[] {
  const manifest = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as {
    contributes?: {
      commands?: Array<{ command: string }>;
      keybindings?: Array<{ command: string }>;
    };
  };
  return (manifest.contributes?.commands ?? []).map((entry) => entry.command);
}

function loadRegisteredCommands(): string[] {
  const source = readFileSync(
    path.join(process.cwd(), "src/extension/commands.ts"),
    "utf8",
  );
  return [
    ...source.matchAll(/registerCommand\(\s*"([^"]+)"/g),
  ].map((match) => match[1]!);
}

describe("package.json command contributions", () => {
  it("exposes Open Settings and Ask About deep-link commands", () => {
    const commands = new Set(loadManifestCommands());
    for (const id of [
      "altai.openSidePanel",
      "altai.openSettings",
      "altai.askAboutSelection",
      "altai.askAboutActiveFile",
      "altai.askAboutWorkingTree",
      "altai.askAboutTerminal",
    ]) {
      expect(commands.has(id), `missing command ${id}`).toBe(true);
    }
    const manifest = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as {
      contributes?: { keybindings?: Array<{ command: string }> };
    };
    const keybound = new Set(
      (manifest.contributes?.keybindings ?? []).map((entry) => entry.command),
    );
    expect(keybound.has("altai.openSettings")).toBe(true);
    expect(keybound.has("altai.askAboutTerminal")).toBe(true);
    expect(keybound.has("altai.openLogs")).toBe(true);
    expect(keybound.has("altai.runDiagnostics")).toBe(true);
    expect(keybound.has("altai.openOperations")).toBe(true);
    expect(keybound.has("altai.restartAgentHost")).toBe(true);
  });

  it("keeps package contributes.commands in sync with registerCommands", () => {
    const contributed = new Set(loadManifestCommands());
    const registered = new Set(loadRegisteredCommands());
    expect(registered.size).toBeGreaterThan(0);
    expect([...registered].sort()).toEqual([...contributed].sort());
  });

  it("exposes Ask About Active File in explorer context", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as {
      contributes?: {
        menus?: Record<string, Array<{ command: string; when?: string }>>;
      };
    };
    const explorer = manifest.contributes?.menus?.["explorer/context"] ?? [];
    expect(
      explorer.some((entry) => entry.command === "altai.askAboutActiveFile"),
    ).toBe(true);
    expect(
      explorer.some((entry) => entry.command === "altai.askAboutWorkingTree"),
    ).toBe(true);
    const terminal = manifest.contributes?.menus?.["terminal/context"] ?? [];
    expect(
      terminal.some((entry) => entry.command === "altai.askAboutTerminal"),
    ).toBe(true);
    const viewTitle = manifest.contributes?.menus?.["view/title"] ?? [];
    expect(
      viewTitle.some((entry) => entry.command === "altai.openSettings"),
    ).toBe(true);
    expect(
      viewTitle.some((entry) => entry.command === "altai.openOperations"),
    ).toBe(true);
  });
});
