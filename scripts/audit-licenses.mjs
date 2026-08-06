#!/usr/bin/env node
/**
 * Direct production dependency license allow-list check (V7).
 * Uses package-lock.json metadata so CI stays lockfile-frozen and dep-free.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ALLOWED = new Set([
  "mit",
  "apache-2.0",
  "apache 2.0",
  "bsd-2-clause",
  "bsd-3-clause",
  "isc",
  "0bsd",
  "unlicense",
  "cc0-1.0",
  "wtfpl",
  "blueoak-1.0.0",
  "python-2.0",
  "zlib",
  "artistic-2.0",
]);

const DISALLOWED = new Set([
  "gpl-2.0",
  "gpl-2.0-only",
  "gpl-2.0-or-later",
  "gpl-3.0",
  "gpl-3.0-only",
  "gpl-3.0-or-later",
  "agpl-3.0",
  "agpl-3.0-only",
  "agpl-3.0-or-later",
  "sspl-1.0",
  "busl-1.1",
]);

function tokenize(raw) {
  return raw
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND)\s+/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

function isAllowed(raw) {
  if (!raw || !String(raw).trim()) return false;
  const tokens = tokenize(String(raw));
  if (tokens.length === 0) return false;
  for (const token of tokens) {
    if (DISALLOWED.has(token.toLowerCase())) return false;
  }
  return tokens.every((t) => ALLOWED.has(t.toLowerCase()));
}

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(
  readFileSync(path.join(root, "package-lock.json"), "utf8"),
);

const deps = pkg.dependencies ?? {};
const lockPackages = lock.packages ?? {};

function resolveLicense(name) {
  // npm lock v2/v3: packages["node_modules/<name>"]
  const entry =
    lockPackages[`node_modules/${name}`] ??
    lockPackages[name] ??
    undefined;
  if (entry && typeof entry.license === "string") {
    return entry.license;
  }
  // file: deps: try sibling package.json then treat as workspace-owned.
  const version = deps[name];
  if (typeof version === "string" && version.startsWith("file:")) {
    try {
      const local = JSON.parse(
        readFileSync(
          path.resolve(root, version.slice("file:".length), "package.json"),
          "utf8",
        ),
      );
      if (typeof local.license === "string") return local.license;
    } catch {
      // fall through
    }
    // Workspace `file:` packages (pre-npm publish) inherit repo Apache-2.0.
    return "Apache-2.0";
  }
  return undefined;
}

/** @type {{name:string,license:string,reason:string}[]} */
const findings = [];
for (const name of Object.keys(deps).sort()) {
  const license = resolveLicense(name);
  if (!isAllowed(license)) {
    findings.push({
      name,
      license: license ?? "(missing)",
      reason: license
        ? "not on allow list / disallowed SPDX"
        : "missing license metadata",
    });
  }
}

if (findings.length > 0) {
  console.error("License audit failed for production dependencies:");
  for (const f of findings) {
    console.error(`  ${f.name}: ${f.license} (${f.reason})`);
  }
  process.exit(1);
}

console.log(
  `License audit passed (${Object.keys(deps).length} production dependencies).`,
);
