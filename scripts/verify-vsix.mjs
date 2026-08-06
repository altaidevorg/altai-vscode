#!/usr/bin/env node
/**
 * Audit a packaged .vsix for single-target native host layout (V7).
 *
 * Usage:
 *   node scripts/verify-vsix.mjs --vsix=altai-0.1.0-linux-x64.vsix --target=linux-x64
 *
 * Lists archive entries via system `unzip -Z1` and validates with the same
 * rules as src/extension/host/vsixContents.ts (unit-tested).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const SUPPORTED = new Set([
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "win32-x64",
]);

const args = process.argv.slice(2);
const vsixArg = args.find((a) => a.startsWith("--vsix="));
const targetArg = args.find((a) => a.startsWith("--target="));
const vsixPath = vsixArg
  ? path.resolve(vsixArg.slice("--vsix=".length))
  : undefined;
const target = targetArg?.slice("--target=".length);

if (!vsixPath || !target) {
  console.error(
    "Usage: node scripts/verify-vsix.mjs --vsix=<path.vsix> --target=<os-arch>",
  );
  process.exit(1);
}

if (!SUPPORTED.has(target)) {
  console.error(`Unsupported target: ${target}`);
  process.exit(1);
}

if (!existsSync(vsixPath)) {
  console.error(`VSIX not found: ${vsixPath}`);
  process.exit(1);
}

const list = spawnSync("unzip", ["-Z1", vsixPath], { encoding: "utf8" });
if (list.status !== 0) {
  console.error(list.stderr || "unzip -Z1 failed");
  process.exit(list.status ?? 1);
}

const entries = list.stdout
  .split("\n")
  .map((line) => line.trim().replace(/\\/g, "/").replace(/\/+$/, ""))
  .filter(Boolean);

function fail(code, message) {
  return { level: "error", code, message };
}

/** @type {{ level: string, code: string, message: string }[]} */
const findings = [];

const required = [
  "extension/package.json",
  "extension/dist/extension/extension.js",
  "extension/dist/webview/main.js",
  "extension/dist/webview/main.css",
];
const set = new Set(entries);
for (const p of required) {
  if (!set.has(p)) findings.push(fail("vsix_asset_missing", `missing ${p}`));
}

const isWin = target.startsWith("win32");
const hostName = isWin ? "altai-agent-host.exe" : "altai-agent-host";
const hostPath = `extension/resources/native/${target}/${hostName}`;
const checksumPath = `${hostPath}.sha256`;
if (!set.has(hostPath)) {
  findings.push(fail("vsix_host_missing", `missing ${hostPath}`));
}
if (!set.has(checksumPath)) {
  findings.push(fail("vsix_checksum_missing", `missing ${checksumPath}`));
}

const nativeTargets = new Set();
for (const entry of entries) {
  const prefix = "extension/resources/native/";
  if (!entry.startsWith(prefix)) continue;
  const dir = entry.slice(prefix.length).split("/")[0];
  // Skip files directly under native/ (e.g. PIN.json)
  if (!dir || dir.includes(".")) continue;
  if (SUPPORTED.has(dir)) {
    nativeTargets.add(dir);
  } else {
    findings.push(
      fail("vsix_unknown_target", `unsupported native target: ${dir}`),
    );
  }
}
for (const found of nativeTargets) {
  if (found !== target) {
    findings.push(
      fail("vsix_extra_target", `unexpected native target: ${found}`),
    );
  }
}
if (!nativeTargets.has(target)) {
  findings.push(
    fail("vsix_target_dir_missing", `missing native dir for ${target}`),
  );
}

for (const entry of entries) {
  if (entry.endsWith(".map")) {
    findings.push(fail("vsix_source_map", `map must not ship: ${entry}`));
  }
  if (
    entry.startsWith("extension/src/") ||
    entry.startsWith("extension/test/") ||
    entry.startsWith("extension/scripts/")
  ) {
    findings.push(fail("vsix_dev_tree", `dev path in VSIX: ${entry}`));
  }
}

for (const f of findings) {
  console.log(`error [${f.code}] ${f.message}`);
}

if (findings.length > 0) {
  console.error("VSIX content audit failed.");
  process.exit(1);
}

console.log(
  `VSIX content audit passed (${entries.length} entries, target=${target}).`,
);
