import { describe, expect, it } from "vitest";
import {
  AUTOMATION_INTERVAL_PRESETS,
  newAutomationOwnerChatId,
  validateAutomationDraft,
} from "../../src/webview/automationDraft.js";
import {
  buildOpenOperationsPayload,
  parseOpenOperationsPayload,
} from "../../src/shared/operationsDeepLink.js";

describe("validateAutomationDraft", () => {
  it("accepts every-interval draft", () => {
    const result = validateAutomationDraft({
      title: "  Nightly  ",
      prompt: "  Run checks  ",
      scheduleKind: "every",
      onceAt: "",
      everyMs: AUTOMATION_INTERVAL_PRESETS[1].everyMs,
    });
    expect(result).toEqual({
      ok: true,
      draft: {
        title: "Nightly",
        prompt: "Run checks",
        schedule: {
          kind: "every",
          everyMs: AUTOMATION_INTERVAL_PRESETS[1].everyMs,
        },
        enabled: true,
      },
    });
  });

  it("accepts once schedule ISO", () => {
    const result = validateAutomationDraft({
      title: "One shot",
      prompt: "Do the thing",
      scheduleKind: "once",
      onceAt: "2030-01-15T10:00:00.000Z",
      everyMs: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.schedule).toEqual({
        kind: "once",
        at: "2030-01-15T10:00:00.000Z",
      });
    }
  });

  it("rejects empty title", () => {
    expect(
      validateAutomationDraft({
        title: " ",
        prompt: "x",
        scheduleKind: "every",
        onceAt: "",
        everyMs: 60_000,
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("newAutomationOwnerChatId", () => {
  it("returns a non-empty owner id", () => {
    expect(newAutomationOwnerChatId().length).toBeGreaterThan(8);
  });
});

describe("composeAutomation deep-link", () => {
  it("round-trips composeAutomation", () => {
    const payload = buildOpenOperationsPayload({
      view: "work",
      workHubView: "scheduled",
      composeAutomation: true,
      draftTitle: "Nightly",
    });
    expect(payload.composeAutomation).toBe(true);
    expect(parseOpenOperationsPayload(payload)).toEqual(payload);
  });
});
