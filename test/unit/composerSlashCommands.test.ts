import { describe, expect, it } from "vitest";
import {
  findSlashCommands,
  formatSlashHelpDigest,
  tryRunSlashCommand,
} from "../../src/webview/composerSlashCommands.js";

describe("findSlashCommands", () => {
  it("filters by name and alias", () => {
    expect(findSlashCommands("task").some((c) => c.name === "tasks")).toBe(
      true,
    );
    expect(findSlashCommands("work").some((c) => c.name === "tasks")).toBe(
      true,
    );
    expect(findSlashCommands("zzzzq")).toHaveLength(0);
  });
});

describe("tryRunSlashCommand", () => {
  it("returns none for plain text", () => {
    expect(tryRunSlashCommand("hello")).toEqual({ kind: "none" });
  });

  it("maps action commands", () => {
    expect(tryRunSlashCommand("/tasks")).toMatchObject({
      kind: "handled",
      action: "tasks",
    });
    expect(tryRunSlashCommand("/new")).toMatchObject({
      kind: "handled",
      action: "new",
    });
  });

  it("expands prompt commands", () => {
    const result = tryRunSlashCommand("/fix flaky test in CI");
    expect(result.kind).toBe("send-prompt");
    if (result.kind !== "send-prompt") {
      return;
    }
    expect(result.commandName).toBe("fix");
    expect(result.prompt).toContain("Focus from the user: flaky test in CI");
  });

  it("turns /review with a scope into a send-prompt", () => {
    const result = tryRunSlashCommand("/review auth middleware");
    expect(result.kind).toBe("send-prompt");
  });

  it("maps settings actions", () => {
    expect(tryRunSlashCommand("/settings")).toMatchObject({
      kind: "handled",
      action: "settings",
    });
    expect(tryRunSlashCommand("/models")).toMatchObject({
      kind: "handled",
      action: "models",
    });
    expect(tryRunSlashCommand("/cancel")).toMatchObject({
      kind: "handled",
      action: "stop",
    });
  });

  it("maps recovery actions", () => {
    expect(tryRunSlashCommand("/logs")).toMatchObject({
      kind: "handled",
      action: "logs",
    });
    expect(tryRunSlashCommand("/diag")).toMatchObject({
      kind: "handled",
      action: "diagnostics",
    });
    expect(tryRunSlashCommand("/restart")).toMatchObject({
      kind: "handled",
      action: "restart-host",
    });
  });

  it("opens new task and automation composers", () => {
    expect(tryRunSlashCommand("/new-task Fix CI")).toMatchObject({
      kind: "handled",
      action: "new-task",
      tail: "Fix CI",
    });
    expect(tryRunSlashCommand("/task")).toMatchObject({
      kind: "handled",
      action: "new-task",
    });
    expect(tryRunSlashCommand("/new-automation Nightly")).toMatchObject({
      kind: "handled",
      action: "new-automation",
      tail: "Nightly",
    });
  });

  it("shows version compatibility", () => {
    expect(tryRunSlashCommand("/version")).toMatchObject({
      kind: "handled",
      action: "version",
    });
    expect(tryRunSlashCommand("/compat")).toMatchObject({
      kind: "handled",
      action: "version",
    });
  });

  it("copies the transcript", () => {
    expect(tryRunSlashCommand("/copy")).toMatchObject({
      kind: "handled",
      action: "copy",
    });
    expect(tryRunSlashCommand("/export")).toMatchObject({
      kind: "handled",
      action: "copy",
    });
  });
});

describe("formatSlashHelpDigest", () => {
  it("summarizes all commands or a filter", () => {
    const all = formatSlashHelpDigest();
    expect(all).toContain("/help");
    expect(all).toContain("/new");
    const subset = formatSlashHelpDigest("settings");
    expect(subset).toMatch(/settings/i);
    expect(formatSlashHelpDigest("zzzzq")).toMatch(/No slash commands match/);
  });
});
