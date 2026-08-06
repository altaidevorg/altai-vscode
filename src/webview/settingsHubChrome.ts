/**
 * Pure helpers for the collated Settings surface (which sections mount).
 */

export type SettingsHubSectionId =
  | "provider"
  | "model"
  | "permission"
  | "mcp"
  | "skills";

export function listSettingsHubSections(input: {
  canProvider: boolean;
  canModel: boolean;
  canPermission: boolean;
  canMcp: boolean;
  canSkills: boolean;
}): SettingsHubSectionId[] {
  const sections: SettingsHubSectionId[] = [];
  if (input.canProvider) {
    sections.push("provider");
  }
  if (input.canModel) {
    sections.push("model");
  }
  if (input.canPermission) {
    sections.push("permission");
  }
  if (input.canMcp) {
    sections.push("mcp");
  }
  if (input.canSkills) {
    sections.push("skills");
  }
  return sections;
}
