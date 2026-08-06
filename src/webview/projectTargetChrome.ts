/**
 * Pure helpers for the Chat project-target chip (no @altai/* imports).
 */

export type WorkspaceTargetInfo = {
  roots: readonly string[];
  trusted?: boolean;
  currentDir?: string;
};

export type ProjectTargetView = {
  name: string;
  path: string | null;
  kind: "local" | "github" | null;
  rootUri: string | null;
};

export function canMountProjectTarget(flags: {
  workspaceInfo: boolean;
}): boolean {
  return flags.workspaceInfo;
}

/**
 * Map host workspace roots onto presentational ChatProjectTarget fields.
 */
export function projectTargetFromWorkspace(
  info: WorkspaceTargetInfo | null | undefined,
): ProjectTargetView {
  if (!info || info.roots.length === 0) {
    return {
      name: "Choose a project",
      path: null,
      kind: null,
      rootUri: null,
    };
  }
  const rootUri = info.roots[0] ?? null;
  const path =
    (info.currentDir && info.currentDir.trim()) ||
    (rootUri ? fsPathFromUri(rootUri) : null);
  const name = basenamePath(path ?? rootUri ?? "Workspace");
  return {
    name,
    path,
    kind: "local",
    rootUri,
  };
}

export function basenamePath(path: string): string {
  const clean = path.replace(/[/\\]+$/, "");
  const parts = clean.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || clean || "Workspace";
}

function fsPathFromUri(uri: string): string | null {
  try {
    if (uri.startsWith("file://")) {
      const without = uri.slice("file://".length);
      // Decode %20 etc. Keep leading slash for absolute posix paths.
      return decodeURIComponent(without);
    }
  } catch {
    /* fall through */
  }
  return uri || null;
}
