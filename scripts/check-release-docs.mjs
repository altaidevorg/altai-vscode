#!/usr/bin/env node
/**
 * Gate: package version has CHANGELOG section + RELEASE.md checklist skeleton
 * + required internal-channel docs/assets on disk.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_PATHS = [
  "CHANGELOG.md",
  "docs/RELEASE.md",
  "docs/FEATURE_MATRIX.md",
  "docs/SECURITY.md",
  "docs/PROTOCOL_COMPATIBILITY.md",
  "media/altai-icon.png",
];

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const release = readFileSync(path.join(root, "docs", "RELEASE.md"), "utf8");

/** @type {{code:string,message:string}[]} */
const findings = [];

if (typeof version !== "string" || !/^\d+\.\d+\.\d+/.test(version)) {
  findings.push({
    code: "version_invalid",
    message: `package version is not semver: ${version}`,
  });
}

if (pkg.preview !== true) {
  findings.push({
    code: "preview_flag",
    message: 'package.json "preview" must be true for the internal channel',
  });
}

if (pkg.icon !== "media/altai-icon.png") {
  findings.push({
    code: "icon_missing",
    message: 'package.json "icon" must be "media/altai-icon.png"',
  });
}

const escaped = String(version).replace(/\./g, "\\.");
const changelogRe = new RegExp(
  `^## \\[${escaped}\\](?:\\s+[—–-]\\s+\\d{4}-\\d{2}-\\d{2})?\\s*$`,
  "m",
);
if (!changelogRe.test(changelog)) {
  findings.push({
    code: "changelog_version_missing",
    message: `CHANGELOG.md must contain a "## [${version}]" section`,
  });
}

const requiredSections = [
  "Channels",
  "Pre-release checklist",
  "Commands",
  "Versioning rules",
];
for (const title of requiredSections) {
  const re = new RegExp(
    `^## ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "m",
  );
  if (!re.test(release)) {
    findings.push({
      code: "release_section_missing",
      message: `docs/RELEASE.md missing "## ${title}" section`,
    });
  }
}

for (const token of ["npm run verify", "package:target", "verify:vsix"]) {
  if (!release.includes(token)) {
    findings.push({
      code: "release_command_missing",
      message: `docs/RELEASE.md must document \`${token}\``,
    });
  }
}

for (const relative of REQUIRED_PATHS) {
  if (!existsSync(path.join(root, relative))) {
    findings.push({
      code: "internal_doc_missing",
      message: `required path missing: ${relative}`,
    });
  }
}

if (findings.length > 0) {
  console.error("Release docs check failed:");
  for (const f of findings) {
    console.error(`  [${f.code}] ${f.message}`);
  }
  process.exit(1);
}

console.log(`Release docs check passed (version ${version}, internal preview).`);
