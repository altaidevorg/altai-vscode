/**
 * Studio SettingsContent section ids — app surface + VS Code host extras.
 * Shared section catalog lives in `@altai/agent-ui` (A6.83).
 */

export {
  SETTINGS_HUB_SECTION_DEFS,
  listSettingsHubNav,
  listSettingsHubSections,
  normalizeSettingsHubSection,
  type SettingsHubCapabilityFlags,
  type SettingsHubNavItem,
  type SettingsHubSectionId,
} from "@altai/agent-ui";

// Re-export preferences helpers for webview modules that already imported these.
export {
  defaultExtensionPreferences as defaultExtensionSettings,
  EXTENSION_SETTING_KEYS,
  isExtensionSettingKey,
  type ExtensionPreferences as ExtensionSettingsSnapshot,
  type ExtensionSettingKey,
} from "@altai/agent-ui";
