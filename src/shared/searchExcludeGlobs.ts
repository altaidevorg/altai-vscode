/**
 * Build a findFiles exclude GlobPattern from VS Code files/search exclude
 * maps, always including baseline ignore folders.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.114). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

const DEFAULT_EXCLUDE_PATTERNS = ["**/.git", "**/node_modules"] as const;

export function enabledExcludePatterns(
  excludeMap: Record<string, unknown> | undefined,
): string[] {
  if (!excludeMap || typeof excludeMap !== "object") {
    return [];
  }
  const patterns: string[] = [];
  for (const [key, value] of Object.entries(excludeMap)) {
    if (value === true) {
      const pattern = key.trim();
      if (pattern) {
        patterns.push(pattern);
      }
    }
  }
  return patterns;
}

/**
 * Combined brace or single glob for vscode.workspace.findFiles exclude.
 */
export function searchExcludeGlobFromSettings(input: {
  filesExclude?: Record<string, unknown>;
  searchExclude?: Record<string, unknown>;
}): string {
  const patterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...enabledExcludePatterns(input.filesExclude),
    ...enabledExcludePatterns(input.searchExclude),
  ];
  const unique = [...new Set(patterns)];
  if (unique.length === 0) {
    return "**/{.git,node_modules}/**";
  }
  if (unique.length === 1) {
    return unique[0]!;
  }
  return `{${unique.join(",")}}`;
}
