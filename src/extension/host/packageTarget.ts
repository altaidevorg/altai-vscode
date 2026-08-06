/**
 * Single-target VSIX packaging helpers (V7 / TASK-012).
 * Staging and naming rules are pure so unit tests can cover them without vsce.
 */
import {
  isSupportedNativeTarget,
  nativeHostFileName,
  packagedNativeDirRelative,
  type NativeTarget,
} from "./nativeTargets.js";

/** Files/directories copied into a single-target package staging root. */
export const PACKAGE_STAGING_ENTRIES = [
  "package.json",
  "README.md",
  "LICENSE",
  ".vscodeignore",
  "dist",
  "media",
  "resources/icons",
] as const;

export type PackageTargetPlan = {
  target: NativeTarget;
  stagingDirRelative: string;
  nativeDirRelative: string;
  hostFileName: string;
  vsixFileName: string;
  hostRelativePath: string;
  checksumRelativePath: string;
};

/**
 * Build a naming/path plan for packaging one OS/arch VSIX.
 */
export function planPackageTarget(options: {
  target: string;
  version: string;
  stagingRootRelative?: string;
}): PackageTargetPlan {
  if (!isSupportedNativeTarget(options.target)) {
    throw new Error(
      `unsupported package target "${options.target}"; expected one of: darwin-arm64, darwin-x64, linux-x64, win32-x64`,
    );
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(options.version)) {
    throw new Error(`invalid extension version for packaging: ${options.version}`);
  }

  const target = options.target;
  const stagingRoot = options.stagingRootRelative ?? ".package";
  const stagingDirRelative = `${stagingRoot}/${target}`;
  const platform = target.startsWith("win32") ? "win32" : "other";
  const hostFileName = nativeHostFileName(platform);
  const nativeDirRelative = packagedNativeDirRelative(target);
  const hostRelativePath = `${nativeDirRelative}/${hostFileName}`;

  return {
    target,
    stagingDirRelative,
    nativeDirRelative,
    hostFileName,
    vsixFileName: vsixArtifactName(options.version, target),
    hostRelativePath,
    checksumRelativePath: `${hostRelativePath}.sha256`,
  };
}

export function vsixArtifactName(version: string, target: NativeTarget): string {
  return `altai-${version}-${target}.vsix`;
}

/**
 * Resolve which host binary path should be staged.
 * Prefers an explicit override, else a packaged layout under the extension root.
 */
export function resolveHostSourcePath(options: {
  extensionRoot: string;
  target: NativeTarget;
  hostOverride?: string | undefined;
  pathJoin?: (...parts: string[]) => string;
  exists?: (path: string) => boolean;
}):
  | { ok: true; path: string; source: "override" | "packaged" }
  | { ok: false; message: string } {
  const join = options.pathJoin ?? ((...parts: string[]) => parts.join("/"));
  const exists = options.exists ?? (() => false);
  const platform = options.target.startsWith("win32") ? "win32" : "other";
  const fileName = nativeHostFileName(platform);

  const override = options.hostOverride?.trim();
  if (override) {
    if (!exists(override)) {
      return {
        ok: false,
        message: `host binary not found at --host path: ${override}`,
      };
    }
    return { ok: true, path: override, source: "override" };
  }

  const packaged = join(
    options.extensionRoot,
    "resources",
    "native",
    options.target,
    fileName,
  );
  if (exists(packaged)) {
    return { ok: true, path: packaged, source: "packaged" };
  }

  return {
    ok: false,
    message:
      `No host binary for ${options.target}. Pass --host=/absolute/path/to/altai-agent-host` +
      ` or place it at resources/native/${options.target}/${fileName}.`,
  };
}

/**
 * Hex SHA-256 body for a .sha256 sidecar (one line, lowercase hex only).
 */
export function formatNativeChecksum(digestHex: string): string {
  const normalized = digestHex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("native host checksum must be 64 lowercase hex characters");
  }
  return `${normalized}\n`;
}

export function parsePackageTargetArgs(argv: readonly string[]): {
  target: string | undefined;
  host: string | undefined;
  outDir: string | undefined;
  skipVerify: boolean;
  help: boolean;
} {
  let target: string | undefined;
  let host: string | undefined;
  let outDir: string | undefined;
  let skipVerify = false;
  let help = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--skip-verify") {
      skipVerify = true;
      continue;
    }
    if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
      continue;
    }
    if (arg.startsWith("--host=")) {
      host = arg.slice("--host=".length);
      continue;
    }
    if (arg.startsWith("--out-dir=")) {
      outDir = arg.slice("--out-dir=".length);
      continue;
    }
    if (!arg.startsWith("-") && !target) {
      target = arg;
    }
  }

  return { target, host, outDir, skipVerify, help };
}
