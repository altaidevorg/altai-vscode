import { describe, expect, it } from "vitest";
import {
  listSettingsHubNav,
  listSettingsHubSections,
  normalizeSettingsHubSection,
} from "../../src/webview/settingsHubChrome.js";
import {
  filterPluginSettingsNav,
  groupPluginSettingsNav,
  normalizePluginSettingsSection,
  PLUGIN_SETTINGS_NAV,
} from "../../src/webview/pluginSettingsChrome.js";
import {
  coerceExtensionPreferences,
  defaultExtensionPreferences,
  parseSnippetsJson,
} from "../../src/shared/extensionPreferences.js";

describe("listSettingsHubNav", () => {
  it("lists plugin-only sections (no Desktop Languages/GitHub)", () => {
    const ids = listSettingsHubNav({
      canProvider: true,
      canModel: true,
      canPermission: true,
      canCompaction: true,
      canMcp: true,
      canSkills: true,
    }).map((item) => item.id);
    expect(ids).toEqual([
      "models",
      "context",
      "agents",
      "skills",
      "mcp",
      "hooks",
      "general",
      "accessibility",
      "host",
      "shortcuts",
      "about",
    ]);
    expect(ids).not.toContain("github");
    expect(ids).not.toContain("languages");
  });
});

describe("listSettingsHubSections", () => {
  it("returns every plugin section id", () => {
    expect(
      listSettingsHubSections({
        canProvider: false,
        canModel: false,
        canPermission: false,
        canMcp: false,
        canSkills: false,
      }),
    ).toHaveLength(PLUGIN_SETTINGS_NAV.length);
  });
});

describe("normalizeSettingsHubSection", () => {
  it("maps legacy provider/model tabs to models", () => {
    const available = listSettingsHubSections({
      canProvider: true,
      canModel: true,
      canPermission: true,
      canMcp: true,
      canSkills: true,
    });
    expect(normalizeSettingsHubSection("provider", available)).toBe("models");
    expect(normalizeSettingsHubSection("permission", available)).toBe("models");
    expect(normalizeSettingsHubSection("about", available)).toBe("about");
  });

  it("maps Desktop-only deep links into the plugin catalog", () => {
    expect(normalizePluginSettingsSection("github")).toBe("general");
    expect(normalizePluginSettingsSection("languages")).toBe("general");
    expect(normalizePluginSettingsSection("language-servers")).toBe("general");
  });
});

describe("pluginSettingsChrome grouping", () => {
  it("groups Agent / Panel / Extension", () => {
    const grouped = groupPluginSettingsNav(filterPluginSettingsNav(""));
    expect(grouped.map((g) => g.group)).toEqual([
      "agent",
      "panel",
      "extension",
    ]);
  });

  it("filters by query", () => {
    const hits = filterPluginSettingsNav("host path");
    expect(hits.some((h) => h.id === "host")).toBe(true);
  });
});

describe("extensionPreferences", () => {
  it("coerces defaults and snippets", () => {
    const prefs = coerceExtensionPreferences({
      highContrast: true,
      reduceMotion: "always",
      snippetsJson: '[{"id":"1","handle":"pr","body":"Write a PR"}]',
    });
    expect(prefs.highContrast).toBe(true);
    expect(prefs.reduceMotion).toBe("always");
    expect(prefs.openPanelOnStartup).toBe(
      defaultExtensionPreferences().openPanelOnStartup,
    );
    expect(parseSnippetsJson(prefs.snippetsJson)).toEqual([
      { id: "1", handle: "pr", body: "Write a PR" },
    ]);
  });
});
