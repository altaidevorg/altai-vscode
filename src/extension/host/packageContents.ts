/**
 * Package-content audit helpers (V7 packaging / TASK-012).
 * Pure checks over an on-disk extension tree or manifest snapshot.
 */
import { createHash } from "node:crypto";
import {
  constants as fsConstants,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import {
  isSupportedNativeTarget,
  nativeHostFileName,
  SUPPORTED_NATIVE_TARGETS,
  type NativeTarget,
} from "./nativeTargets.js";

export type PackageFinding = {
  level: "error" | "warn";
  code: string;
  message: string;
};

export type PackageManifestSnapshot = {
  name?: unknown;
  main?: unknown;
  engines?: { vscode?: unknown };
  extensionKind?: unknown;
  capabilities?: {
    untrustedWorkspaces?: { supported?: unknown };
    virtualWorkspaces?: { supported?: unknown };
  };
};

export type AuditPackageOptions = {
  /** Extension root directory (contains package.json, dist/, resources/). */
  extensionRoot: string;
  /**
   * When true, fail if no native host binary is present for requireTargets
   * (or every supported target when requireTargets is omitted).
   * Default false — CI without prebuilt hosts still packages shell assets.
   */
  requireNativeHosts?: boolean;
  /**
   * Targets that must ship a host binary when requireNativeHosts is true.
   * Defaults to every SUPPORTED_NATIVE_TARGET.
   */
  requireTargets?: readonly NativeTarget[];
  /**
   * When set (e.g. single-platform VSIX), fail if any other target directory
   * is present under resources/native.
   */
  expectedSingleTarget?: NativeTarget;
  /** Skip filesystem existence checks for built assets (manifest-only). */
  skipBuiltAssets?: boolean;
  /**
   * Optional pre-parsed package.json (tests). When omitted, read from root.
   */
  manifest?: PackageManifestSnapshot;
};

export type AuditPackageResult = {
  ok: boolean;
  findings: PackageFinding[];
};

export function auditPackageContents(
  options: AuditPackageOptions,
): AuditPackageResult {
  const findings: PackageFinding[] = [];
  const root = options.extensionRoot;

  const manifest =
    options.manifest ??
    (readJsonManifest(path.join(root, "package.json"), findings) as
      | PackageManifestSnapshot
      | undefined);

  if (manifest) {
    auditManifest(manifest, findings);
  }

  if (!options.skipBuiltAssets) {
    auditBuiltAssets(root, findings);
  }

  auditNativeLayout(root, options, findings);

  return {
    ok: findings.every((f) => f.level !== "error"),
    findings,
  };
}

function readJsonManifest(
  filePath: string,
  findings: PackageFinding[],
): unknown {
  if (!existsSync(filePath)) {
    findings.push({
      level: "error",
      code: "manifest_missing",
      message: "package.json is missing",
    });
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    findings.push({
      level: "error",
      code: "manifest_invalid",
      message: `package.json is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return undefined;
  }
}

export function auditManifest(
  manifest: PackageManifestSnapshot,
  findings: PackageFinding[] = [],
): PackageFinding[] {
  if (manifest.name !== "altai") {
    findings.push({
      level: "error",
      code: "manifest_name",
      message: `package name must be "altai", got ${JSON.stringify(manifest.name)}`,
    });
  }

  if (manifest.main !== "./dist/extension/extension.js") {
    findings.push({
      level: "error",
      code: "manifest_main",
      message: `main must be "./dist/extension/extension.js", got ${JSON.stringify(manifest.main)}`,
    });
  }

  const kinds = normalizeExtensionKind(manifest.extensionKind);
  if (!kinds.includes("workspace")) {
    findings.push({
      level: "error",
      code: "manifest_extension_kind",
      message:
        'extensionKind must include "workspace" so Remote SSH/WSL/Dev Containers run the host on the remote',
    });
  }
  if (kinds.includes("ui") && kinds.length === 1) {
    findings.push({
      level: "error",
      code: "manifest_extension_kind_ui_only",
      message:
        'extensionKind must not be UI-only; the native agent host must run in the workspace (remote) Extension Host',
    });
  }

  const untrusted = manifest.capabilities?.untrustedWorkspaces?.supported;
  if (untrusted !== "limited" && untrusted !== false) {
    findings.push({
      level: "error",
      code: "manifest_untrusted",
      message:
        'capabilities.untrustedWorkspaces.supported must be "limited" (or false)',
    });
  }

  const virtual = manifest.capabilities?.virtualWorkspaces?.supported;
  if (virtual === true || virtual === "true") {
    findings.push({
      level: "error",
      code: "manifest_virtual",
      message:
        "virtualWorkspaces full support is rejected; native host requires a local FS on the remote",
    });
  } else if (virtual !== "limited" && virtual !== false && virtual !== undefined) {
    findings.push({
      level: "warn",
      code: "manifest_virtual_unknown",
      message: `unexpected virtualWorkspaces.supported value: ${JSON.stringify(virtual)}`,
    });
  }

  const engine = manifest.engines?.vscode;
  if (typeof engine !== "string" || !engine.trim()) {
    findings.push({
      level: "error",
      code: "manifest_engines",
      message: "engines.vscode must be a non-empty string",
    });
  }

  return findings;
}

function normalizeExtensionKind(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

function auditBuiltAssets(root: string, findings: PackageFinding[]): void {
  const required = [
    "dist/extension/extension.js",
    "dist/webview/main.js",
    "dist/webview/main.css",
  ];
  for (const relative of required) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) {
      findings.push({
        level: "error",
        code: "asset_missing",
        message: `required build asset missing: ${relative}`,
      });
      continue;
    }
    try {
      const stats = statSync(absolute);
      if (!stats.isFile() || stats.size === 0) {
        findings.push({
          level: "error",
          code: "asset_empty",
          message: `required build asset empty or not a file: ${relative}`,
        });
      }
    } catch {
      findings.push({
        level: "error",
        code: "asset_unreadable",
        message: `required build asset unreadable: ${relative}`,
      });
    }
  }
}

function auditNativeLayout(
  root: string,
  options: AuditPackageOptions,
  findings: PackageFinding[],
): void {
  const nativeRoot = path.join(root, "resources", "native");
  if (!existsSync(nativeRoot)) {
    if (options.requireNativeHosts) {
      findings.push({
        level: "error",
        code: "native_root_missing",
        message: "resources/native is required when native hosts are mandated",
      });
    }
    return;
  }

  let entries: string[];
  try {
    entries = readdirSync(nativeRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    findings.push({
      level: "error",
      code: "native_root_unreadable",
      message: "resources/native is not readable",
    });
    return;
  }

  for (const name of entries) {
    if (!isSupportedNativeTarget(name)) {
      findings.push({
        level: "error",
        code: "native_unknown_target",
        message: `unsupported native target directory: resources/native/${name}`,
      });
      continue;
    }

    if (
      options.expectedSingleTarget &&
      name !== options.expectedSingleTarget
    ) {
      findings.push({
        level: "error",
        code: "native_extra_target",
        message: `single-target package must only contain ${options.expectedSingleTarget}, found ${name}`,
      });
    }

    auditNativeTargetDir(nativeRoot, name, findings);
  }

  if (options.requireNativeHosts) {
    const required = options.requireTargets ?? SUPPORTED_NATIVE_TARGETS;
    for (const target of required) {
      const dir = path.join(nativeRoot, target);
      if (!existsSync(dir)) {
        findings.push({
          level: "error",
          code: "native_target_missing",
          message: `required native host target missing: resources/native/${target}`,
        });
      }
    }
  }
}

function auditNativeTargetDir(
  nativeRoot: string,
  target: NativeTarget,
  findings: PackageFinding[],
): void {
  const platform = target.startsWith("win32") ? "win32" : "other";
  const fileName = nativeHostFileName(platform);
  const binaryPath = path.join(nativeRoot, target, fileName);

  if (!existsSync(binaryPath)) {
    findings.push({
      level: "error",
      code: "native_binary_missing",
      message: `native host binary missing for ${target}: ${fileName}`,
    });
    return;
  }

  let stats;
  try {
    stats = statSync(binaryPath);
  } catch {
    findings.push({
      level: "error",
      code: "native_binary_unreadable",
      message: `native host binary unreadable for ${target}`,
    });
    return;
  }

  if (!stats.isFile() || stats.size === 0) {
    findings.push({
      level: "error",
      code: "native_binary_empty",
      message: `native host binary empty or not a file for ${target}`,
    });
    return;
  }

  if (platform !== "win32") {
    const executable =
      (stats.mode & fsConstants.S_IXUSR) !== 0 ||
      (stats.mode & fsConstants.S_IXGRP) !== 0 ||
      (stats.mode & fsConstants.S_IXOTH) !== 0;
    if (!executable) {
      findings.push({
        level: "error",
        code: "native_binary_not_executable",
        message: `native host binary is not executable for ${target}`,
      });
    }
  }

  const digestPath = `${binaryPath}.sha256`;
  if (existsSync(digestPath)) {
    try {
      const expected = readFileSync(digestPath, "utf8").trim().toLowerCase();
      const actual = createHash("sha256")
        .update(readFileSync(binaryPath))
        .digest("hex");
      if (!/^[0-9a-f]{64}$/.test(expected) || expected !== actual) {
        findings.push({
          level: "error",
          code: "native_checksum_mismatch",
          message: `native host checksum mismatch for ${target}`,
        });
      }
    } catch {
      findings.push({
        level: "error",
        code: "native_checksum_unreadable",
        message: `native host checksum unreadable for ${target}`,
      });
    }
  } else {
    findings.push({
      level: "warn",
      code: "native_checksum_missing",
      message: `native host for ${target} has no .sha256 sidecar (required for release packages)`,
    });
  }
}
