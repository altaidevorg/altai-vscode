/**
 * Validate the file list of a packaged VSIX (V7 packaging).
 * Entries are zip paths (typically `extension/...`).
 */
import {
  isSupportedNativeTarget,
  nativeHostFileName,
  type NativeTarget,
} from "./nativeTargets.js";

export type VsixFinding = {
  level: "error" | "warn";
  code: string;
  message: string;
};

export type AuditVsixEntriesOptions = {
  target: NativeTarget;
  /** Zip entry paths as returned by the archive (forward slashes). */
  entries: readonly string[];
};

export type AuditVsixEntriesResult = {
  ok: boolean;
  findings: VsixFinding[];
};

/**
 * Normalize zip entry to use forward slashes and drop trailing slashes.
 */
export function normalizeVsixEntry(entry: string): string {
  return entry.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function auditVsixEntries(
  options: AuditVsixEntriesOptions,
): AuditVsixEntriesResult {
  const findings: VsixFinding[] = [];
  if (!isSupportedNativeTarget(options.target)) {
    findings.push({
      level: "error",
      code: "vsix_unknown_target",
      message: `unsupported package target: ${options.target}`,
    });
    return { ok: false, findings };
  }

  const entries = options.entries
    .map(normalizeVsixEntry)
    .filter((e) => e.length > 0);
  const set = new Set(entries);

  const required = [
    "extension/package.json",
    "extension/dist/extension/extension.js",
    "extension/dist/webview/main.js",
    "extension/dist/webview/main.css",
  ];
  for (const path of required) {
    if (!set.has(path)) {
      findings.push({
        level: "error",
        code: "vsix_asset_missing",
        message: `required package asset missing: ${path}`,
      });
    }
  }

  const platform = options.target.startsWith("win32") ? "win32" : "other";
  const hostName = nativeHostFileName(platform);
  const hostPath = `extension/resources/native/${options.target}/${hostName}`;
  const checksumPath = `${hostPath}.sha256`;

  if (!set.has(hostPath)) {
    findings.push({
      level: "error",
      code: "vsix_host_missing",
      message: `native host missing: ${hostPath}`,
    });
  }
  if (!set.has(checksumPath)) {
    findings.push({
      level: "error",
      code: "vsix_checksum_missing",
      message: `native host checksum missing: ${checksumPath}`,
    });
  }

  // Exactly one native target directory under extension/resources/native/
  const nativePrefix = "extension/resources/native/";
  const nativeTargets = new Set<string>();
  for (const entry of entries) {
    if (!entry.startsWith(nativePrefix)) continue;
    const rest = entry.slice(nativePrefix.length);
    const targetDir = rest.split("/")[0];
    if (targetDir) {
      nativeTargets.add(targetDir);
    }
  }
  for (const found of nativeTargets) {
    if (found !== options.target) {
      findings.push({
        level: "error",
        code: "vsix_extra_target",
        message: `single-target VSIX must not contain native target: ${found}`,
      });
    }
  }
  if (!nativeTargets.has(options.target)) {
    findings.push({
      level: "error",
      code: "vsix_target_dir_missing",
      message: `native target directory missing: ${nativePrefix}${options.target}`,
    });
  }

  for (const entry of entries) {
    if (entry.endsWith(".map")) {
      findings.push({
        level: "error",
        code: "vsix_source_map",
        message: `source map must not ship in VSIX: ${entry}`,
      });
    }
  }

  // Guard against shipping TypeScript sources or tests
  for (const entry of entries) {
    if (
      entry.startsWith("extension/src/") ||
      entry.startsWith("extension/test/") ||
      entry.startsWith("extension/scripts/")
    ) {
      findings.push({
        level: "error",
        code: "vsix_dev_tree",
        message: `development path must not ship in VSIX: ${entry}`,
      });
    }
  }

  return {
    ok: findings.every((f) => f.level !== "error"),
    findings,
  };
}
