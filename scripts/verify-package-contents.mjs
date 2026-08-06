#!/usr/bin/env node
/**
 * Package-content audit for V7 / TASK-012.
 *
 * Validates:
 * - package.json remote/trust manifest fields
 * - built Extension Host + Webview assets
 * - any resources/native/<target> layouts that are present
 *
 * Native binaries are optional unless ALTAI_REQUIRE_NATIVE_HOST=1 or
 * --require-native is set. Single-target packages may pass
 * ALTAI_PACKAGE_TARGET / --target=.
 *
 * Behavior mirrors src/extension/host/packageContents.ts (unit-tested).
 * Keep this script aligned with those helpers.
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
import { fileURLToPath } from "node:url";

const SUPPORTED = new Set([
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "win32-x64",
]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const requireNative =
  process.env.ALTAI_REQUIRE_NATIVE_HOST === "1" ||
  args.includes("--require-native");
const targetArg = args.find((a) => a.startsWith("--target="));
const expectedSingle =
  targetArg?.slice("--target=".length) ||
  process.env.ALTAI_PACKAGE_TARGET ||
  "";

/** @type {{ level: "error" | "warn"; code: string; message: string }[]} */
const findings = [];

function fail(code, message) {
  findings.push({ level: "error", code, message });
}
function warn(code, message) {
  findings.push({ level: "warn", code, message });
}

// --- package.json
const pkgPath = path.join(root, "package.json");
if (!existsSync(pkgPath)) {
  fail("manifest_missing", "package.json is missing");
} else {
  const manifest = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (manifest.name !== "altai") {
    fail("manifest_name", `package name must be "altai"`);
  }
  if (manifest.main !== "./dist/extension/extension.js") {
    fail("manifest_main", `main must be "./dist/extension/extension.js"`);
  }
  const kinds = Array.isArray(manifest.extensionKind)
    ? manifest.extensionKind
    : typeof manifest.extensionKind === "string"
      ? [manifest.extensionKind]
      : [];
  if (!kinds.includes("workspace")) {
    fail(
      "manifest_extension_kind",
      'extensionKind must include "workspace" for Remote SSH/WSL/Dev Containers',
    );
  }
  const untrusted = manifest.capabilities?.untrustedWorkspaces?.supported;
  if (untrusted !== "limited" && untrusted !== false) {
    fail(
      "manifest_untrusted",
      'capabilities.untrustedWorkspaces.supported must be "limited"',
    );
  }
  const virtual = manifest.capabilities?.virtualWorkspaces?.supported;
  if (virtual === true) {
    fail(
      "manifest_virtual",
      "virtualWorkspaces full support is rejected; native host needs a real FS",
    );
  }
  if (typeof manifest.engines?.vscode !== "string") {
    fail("manifest_engines", "engines.vscode must be a non-empty string");
  }
}

// --- built assets
for (const relative of [
  "dist/extension/extension.js",
  "dist/webview/main.js",
  "dist/webview/main.css",
]) {
  const abs = path.join(root, relative);
  if (!existsSync(abs)) {
    fail("asset_missing", `required build asset missing: ${relative}`);
    continue;
  }
  const stats = statSync(abs);
  if (!stats.isFile() || stats.size === 0) {
    fail("asset_empty", `required build asset empty: ${relative}`);
  }
}

// --- native layout
const nativeRoot = path.join(root, "resources", "native");
if (existsSync(nativeRoot)) {
  const dirs = readdirSync(nativeRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const name of dirs) {
    if (!SUPPORTED.has(name)) {
      fail(
        "native_unknown_target",
        `unsupported native target directory: resources/native/${name}`,
      );
      continue;
    }
    if (expectedSingle && name !== expectedSingle) {
      fail(
        "native_extra_target",
        `single-target package must only contain ${expectedSingle}, found ${name}`,
      );
    }

    const isWin = name.startsWith("win32");
    const fileName = isWin ? "altai-agent-host.exe" : "altai-agent-host";
    const binaryPath = path.join(nativeRoot, name, fileName);
    if (!existsSync(binaryPath)) {
      fail(
        "native_binary_missing",
        `native host binary missing for ${name}: ${fileName}`,
      );
      continue;
    }
    const stats = statSync(binaryPath);
    if (!stats.isFile() || stats.size === 0) {
      fail("native_binary_empty", `native host binary empty for ${name}`);
      continue;
    }
    if (!isWin) {
      const executable =
        (stats.mode & fsConstants.S_IXUSR) !== 0 ||
        (stats.mode & fsConstants.S_IXGRP) !== 0 ||
        (stats.mode & fsConstants.S_IXOTH) !== 0;
      if (!executable) {
        fail(
          "native_binary_not_executable",
          `native host binary is not executable for ${name}`,
        );
      }
    }
    const digestPath = `${binaryPath}.sha256`;
    if (existsSync(digestPath)) {
      const expected = readFileSync(digestPath, "utf8").trim().toLowerCase();
      const actual = createHash("sha256")
        .update(readFileSync(binaryPath))
        .digest("hex");
      if (!/^[0-9a-f]{64}$/.test(expected) || expected !== actual) {
        fail(
          "native_checksum_mismatch",
          `native host checksum mismatch for ${name}`,
        );
      }
    } else {
      warn(
        "native_checksum_missing",
        `native host for ${name} has no .sha256 sidecar`,
      );
    }
  }

  if (requireNative) {
    const required = expectedSingle ? [expectedSingle] : [...SUPPORTED];
    for (const target of required) {
      if (!dirs.includes(target)) {
        fail(
          "native_target_missing",
          `required native host target missing: resources/native/${target}`,
        );
      }
    }
  }
} else if (requireNative) {
  fail(
    "native_root_missing",
    "resources/native is required when native hosts are mandated",
  );
}

if (expectedSingle && !SUPPORTED.has(expectedSingle)) {
  fail("native_unknown_target", `Unknown ALTAI package target: ${expectedSingle}`);
}

for (const finding of findings) {
  const prefix = finding.level === "error" ? "error" : "warn ";
  console.log(`${prefix} [${finding.code}] ${finding.message}`);
}

if (findings.some((f) => f.level === "error")) {
  console.error("Package-content audit failed.");
  process.exit(1);
}

console.log("Package-content audit passed.");
