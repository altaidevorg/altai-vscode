/**
 * Release documentation gates (V7 / ENGINEERING_PLAN Phase 7).
 * Pure checks so CI scripts and unit tests share the same rules.
 */
export type ReleaseDocsInput = {
  version: string;
  changelogMarkdown: string;
  releaseMarkdown: string;
};

export type ReleaseDocsFinding = {
  code: string;
  message: string;
};

/**
 * Require Keep a Changelog section header for the package version.
 * Accepts `## [0.1.0]` or `## [0.1.0] — date` forms.
 */
export function changelogHasVersionSection(
  changelogMarkdown: string,
  version: string,
): boolean {
  const escaped = version.replace(/\./g, "\\.");
  const re = new RegExp(
    `^## \\[${escaped}\\](?:\\s+[—–-]\\s+\\d{4}-\\d{2}-\\d{2})?\\s*$`,
    "m",
  );
  return re.test(changelogMarkdown);
}

/** Required H2 sections in docs/RELEASE.md. */
export const REQUIRED_RELEASE_SECTIONS = [
  "Channels",
  "Pre-release checklist",
  "Commands",
  "Versioning rules",
] as const;

export function releaseDocHasRequiredSections(
  releaseMarkdown: string,
): string[] {
  const missing: string[] = [];
  for (const title of REQUIRED_RELEASE_SECTIONS) {
    const re = new RegExp(`^## ${escapeRegExp(title)}\\s*$`, "m");
    if (!re.test(releaseMarkdown)) {
      missing.push(title);
    }
  }
  return missing;
}

export function auditReleaseDocs(
  input: ReleaseDocsInput,
): ReleaseDocsFinding[] {
  const findings: ReleaseDocsFinding[] = [];

  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(input.version)) {
    findings.push({
      code: "version_invalid",
      message: `package version is not semver: ${input.version}`,
    });
  }

  if (!changelogHasVersionSection(input.changelogMarkdown, input.version)) {
    findings.push({
      code: "changelog_version_missing",
      message: `CHANGELOG.md must contain a "## [${input.version}]" section`,
    });
  }

  const missingSections = releaseDocHasRequiredSections(input.releaseMarkdown);
  for (const title of missingSections) {
    findings.push({
      code: "release_section_missing",
      message: `docs/RELEASE.md missing "## ${title}" section`,
    });
  }

  // Checklist must mention verify and package:target so release SOP stays executable.
  for (const token of ["npm run verify", "package:target", "verify:vsix"]) {
    if (!input.releaseMarkdown.includes(token)) {
      findings.push({
        code: "release_command_missing",
        message: `docs/RELEASE.md must document \`${token}\``,
      });
    }
  }

  return findings;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
