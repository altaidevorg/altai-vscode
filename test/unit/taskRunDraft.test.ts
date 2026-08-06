import { describe, expect, it } from "vitest";
import { validateTaskRunDraft } from "../../src/webview/taskRunDraft.js";
import {
  buildOpenOperationsPayload,
  parseOpenOperationsPayload,
} from "../../src/shared/operationsDeepLink.js";

describe("validateTaskRunDraft", () => {
  it("accepts trimmed title and prompt", () => {
    expect(
      validateTaskRunDraft({
        title: "  Fix login  ",
        prompt: "  Investigate auth regression  ",
      }),
    ).toEqual({
      ok: true,
      draft: { title: "Fix login", prompt: "Investigate auth regression" },
    });
  });

  it("rejects empty fields", () => {
    expect(validateTaskRunDraft({ title: " ", prompt: "x" })).toMatchObject({
      ok: false,
    });
    expect(validateTaskRunDraft({ title: "t", prompt: "  " })).toMatchObject({
      ok: false,
    });
  });
});

describe("composeTask deep-link", () => {
  it("round-trips composeTask and draftTitle", () => {
    const payload = buildOpenOperationsPayload({
      view: "runs",
      composeTask: true,
      draftTitle: "Reuse me",
    });
    expect(payload.composeTask).toBe(true);
    expect(parseOpenOperationsPayload(payload)).toEqual(payload);
  });

  it("rejects non-boolean composeTask", () => {
    expect(
      parseOpenOperationsPayload({
        key: 1,
        view: "runs",
        composeTask: "yes",
      }),
    ).toBeNull();
  });
});
