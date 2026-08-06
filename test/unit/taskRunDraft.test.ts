import { describe, expect, it } from "vitest";
import {
  composeTaskPromptWithSkills,
  toggleTaskSkillSelection,
  validateTaskRunDraft,
} from "../../src/webview/taskRunDraft.js";
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

describe("task skill selection", () => {
  it("toggles and caps at twelve", () => {
    expect(toggleTaskSkillSelection([], " dig ")).toEqual(["dig"]);
    expect(toggleTaskSkillSelection(["dig"], "dig")).toEqual([]);
    const many = Array.from({ length: 13 }, (_, i) => `s${i}`);
    let selected: string[] = [];
    for (const name of many) {
      selected = toggleTaskSkillSelection(selected, name);
    }
    expect(selected).toHaveLength(12);
    expect(selected[0]).toBe("s1");
  });

  it("appends skill blocks to the prompt", () => {
    expect(composeTaskPromptWithSkills("fix it", ["pr-review", "tests"])).toBe(
      [
        "fix it",
        "",
        "<skills>",
        '  <skill name="pr-review" />',
        '  <skill name="tests" />',
        "</skills>",
      ].join("\n"),
    );
    expect(composeTaskPromptWithSkills("hi", [])).toBe("hi");
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
