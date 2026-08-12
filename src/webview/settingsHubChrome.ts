/**
 * Plugin settings hub chrome — catalog is plugin-only (not Desktop app/IDE).
 */

import {
  PLUGIN_SETTINGS_NAV,
  normalizePluginSettingsSection,
  type SettingsHubSectionId,
} from "./pluginSettingsChrome.js";

export type { SettingsHubSectionId } from "./pluginSettingsChrome.js";

export type SettingsHubCapabilityFlags = {
  canProvider: boolean;
  canModel: boolean;
  canPermission: boolean;
  canCompaction?: boolean;
  canMcp: boolean;
  canSkills: boolean;
};

export type SettingsHubNavItem = {
  id: SettingsHubSectionId;
  label: string;
  description: string;
  available: boolean;
};

/** @deprecated Prefer PLUGIN_SETTINGS_NAV — kept for search helpers / tests. */
export const SETTINGS_HUB_SECTION_DEFS = PLUGIN_SETTINGS_NAV.map((item) => ({
  id: item.id,
  label: item.label,
  description: item.description,
}));

export function listSettingsHubNav(
  _caps?: SettingsHubCapabilityFlags,
): SettingsHubNavItem[] {
  return PLUGIN_SETTINGS_NAV.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    available: true,
  }));
}

export function listSettingsHubSections(
  input?: SettingsHubCapabilityFlags,
): SettingsHubSectionId[] {
  return listSettingsHubNav(input).map((item) => item.id);
}

export function normalizeSettingsHubSection(
  raw: string | undefined | null,
  available?: readonly SettingsHubSectionId[],
): SettingsHubSectionId {
  const next = normalizePluginSettingsSection(raw);
  if (available && available.length > 0 && !available.includes(next)) {
    return available[0] ?? "general";
  }
  return next;
}

// Re-export preferences helpers for webview modules that already imported these.
export {
  defaultExtensionPreferences as defaultExtensionSettings,
  EXTENSION_SETTING_KEYS,
  isExtensionSettingKey,
  type ExtensionPreferences as ExtensionSettingsSnapshot,
  type ExtensionSettingKey,
} from "@altai/agent-ui";
