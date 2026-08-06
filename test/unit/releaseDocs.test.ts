import { describe, expect, it } from "vitest";
import {
  auditReleaseDocs,
  changelogHasVersionSection,
  releaseDocHasRequiredSections,
} from "../../src/extension/releaseDocs.js";

const sampleChangelog = `# Changelog

## [0.1.0] — 2026-08-06

### Added

- features

## [0.0.1] — 2026-01-01

- bootstrap
`;

const sampleRelease = `# Release guide

## Channels

table

## Pre-release checklist

- items

## Commands

\`\`\`bash
npm run verify
npm run package:target -- --target=linux-x64 --host=/path
npm run verify:vsix -- --vsix=x.vsix --target=linux-x64
\`\`\`

## Versioning rules

1. bump together
`;

describe("changelogHasVersionSection", () => {
  it("matches Keep a Changelog headers with optional date", () => {
    expect(changelogHasVersionSection(sampleChangelog, "0.1.0")).toBe(true);
    expect(changelogHasVersionSection(sampleChangelog, "9.9.9")).toBe(false);
    expect(
      changelogHasVersionSection("## [1.2.3]\n\nnotes\n", "1.2.3"),
    ).toBe(true);
  });
});

describe("releaseDocHasRequiredSections", () => {
  it("reports missing H2 titles", () => {
    expect(releaseDocHasRequiredSections(sampleRelease)).toEqual([]);
    expect(releaseDocHasRequiredSections("# Only\n")).toContain("Channels");
  });
});

describe("auditReleaseDocs", () => {
  it("passes a complete package version set", () => {
    expect(
      auditReleaseDocs({
        version: "0.1.0",
        changelogMarkdown: sampleChangelog,
        releaseMarkdown: sampleRelease,
      }),
    ).toEqual([]);
  });

  it("fails when changelog or commands are incomplete", () => {
    const findings = auditReleaseDocs({
      version: "0.2.0",
      changelogMarkdown: sampleChangelog,
      releaseMarkdown: "## Channels\n\n## Pre-release checklist\n\n## Commands\n\n## Versioning rules\n",
    });
    const codes = findings.map((f) => f.code);
    expect(codes).toContain("changelog_version_missing");
    expect(codes).toContain("release_command_missing");
  });
});
