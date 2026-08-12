/**
 * Plugin-only settings information architecture.
 * Desktop app / Desktop IDE use SettingsContent surfaces — not this catalog.
 */

export type PluginSettingsGroupId = "agent" | "panel" | "extension";

export type SettingsHubSectionId =
  | "models"
  | "context"
  | "agents"
  | "skills"
  | "mcp"
  | "hooks"
  | "general"
  | "accessibility"
  | "host"
  | "shortcuts"
  | "about";

export type PluginSettingsNavItem = {
  id: SettingsHubSectionId;
  label: string;
  description: string;
  group: PluginSettingsGroupId;
};

export const PLUGIN_SETTINGS_GROUP_LABELS: Record<PluginSettingsGroupId, string> =
  {
    agent: "Agent",
    panel: "Panel",
    extension: "Extension",
  };

/**
 * Narrow side-panel catalog: no Desktop IDE editor prefs, no placeholder
 * Languages / GitHub pages (those belong to the host editor / Accounts).
 */
export const PLUGIN_SETTINGS_NAV: readonly PluginSettingsNavItem[] = [
  {
    id: "models",
    label: "Models",
    description:
      "Default model, failover, and provider credentials for the agent host.",
    group: "agent",
  },
  {
    id: "context",
    label: "Context",
    description: "Compaction budget and workspace ignore rules for agent runs.",
    group: "agent",
  },
  {
    id: "agents",
    label: "Agents",
    description: "Custom instructions and composer #snippets.",
    group: "agent",
  },
  {
    id: "skills",
    label: "Skills",
    description: "Installed agent skills for this workspace.",
    group: "agent",
  },
  {
    id: "mcp",
    label: "MCP",
    description: "Model Context Protocol servers from the agent host.",
    group: "agent",
  },
  {
    id: "hooks",
    label: "Hooks",
    description: "Project WORKFLOW.md / lifecycle hooks for the active root.",
    group: "agent",
  },
  {
    id: "general",
    label: "General",
    description:
      "Side panel startup, composer focus, and other ALTAI extension preferences.",
    group: "panel",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    description:
      "Motion, contrast, text size, and focus rings inside the ALTAI panel.",
    group: "panel",
  },
  {
    id: "host",
    label: "Host",
    description:
      "Agent host path, workspace trust, preferred root, and restart tools.",
    group: "extension",
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    description: "ALTAI command keybindings — customize in the editor.",
    group: "extension",
  },
  {
    id: "about",
    label: "About",
    description: "Extension version, diagnostics, and recovery.",
    group: "extension",
  },
];

const PLUGIN_SECTION_IDS = PLUGIN_SETTINGS_NAV.map((item) => item.id);

/** Map legacy / Desktop-only deep-links into the plugin catalog. */
export function normalizePluginSettingsSection(
  raw: string | undefined | null,
): SettingsHubSectionId {
  if (raw === "provider" || raw === "model" || raw === "permission") {
    return "models";
  }
  if (raw === "language-servers" || raw === "languages" || raw === "github") {
    return "general";
  }
  if (raw && (PLUGIN_SECTION_IDS as readonly string[]).includes(raw)) {
    return raw as SettingsHubSectionId;
  }
  return "general";
}

export function filterPluginSettingsNav(
  query: string,
): PluginSettingsNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...PLUGIN_SETTINGS_NAV];
  }
  return PLUGIN_SETTINGS_NAV.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q),
  );
}

export function groupPluginSettingsNav(
  items: readonly PluginSettingsNavItem[],
): Array<{ group: PluginSettingsGroupId; items: PluginSettingsNavItem[] }> {
  const order: PluginSettingsGroupId[] = ["agent", "panel", "extension"];
  return order
    .map((group) => ({
      group,
      items: items.filter((item) => item.group === group),
    }))
    .filter((block) => block.items.length > 0);
}
