import { describe, expect, it } from "vitest";
import { listSettingsHubSections } from "../../src/webview/settingsHubChrome.js";

describe("listSettingsHubSections", () => {
  it("orders available sections", () => {
    expect(
      listSettingsHubSections({
        canProvider: true,
        canModel: false,
        canPermission: true,
        canMcp: true,
        canSkills: false,
      }),
    ).toEqual(["provider", "permission", "mcp"]);
  });

  it("returns empty when no capabilities", () => {
    expect(
      listSettingsHubSections({
        canProvider: false,
        canModel: false,
        canPermission: false,
        canMcp: false,
        canSkills: false,
      }),
    ).toEqual([]);
  });
});
