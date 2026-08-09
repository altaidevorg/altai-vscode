import { describe, expect, it } from "vitest";
import { parseSkillInstallSource } from "../../src/webview/skillInstallSource.js";

describe("skillInstallSource re-export (A6.143)", () => {
  it("parses owner/repo#skill", () => {
    expect(parseSkillInstallSource("altaidevorg/skills#review")).toEqual({
      repo: "altaidevorg/skills",
      skill: "review",
    });
  });
});
