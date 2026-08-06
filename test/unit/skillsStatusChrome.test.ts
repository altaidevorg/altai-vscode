import { describe, expect, it } from "vitest";
import {
  canMountSkillsStatus,
  skillsSummaryCopy,
  sortSkillsForDisplay,
} from "../../src/webview/skillsStatusChrome.js";

describe("skillsStatusChrome", () => {
  it("gates mount on list capability", () => {
    expect(canMountSkillsStatus({ skillsList: true })).toBe(true);
    expect(canMountSkillsStatus({ skillsList: false })).toBe(false);
  });

  it("summarizes and sorts", () => {
    expect(skillsSummaryCopy([])).toBe("No skills");
    expect(
      skillsSummaryCopy([{ name: "a" }, { name: "b", enabled: false }]),
    ).toBe("1/2 skills enabled");
    expect(
      sortSkillsForDisplay([{ name: "z" }, { name: "a" }]).map((s) => s.name),
    ).toEqual(["a", "z"]);
  });
});
