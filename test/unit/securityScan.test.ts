import { describe, expect, it } from "vitest";
import {
  auditDirectDependencyLicenses,
  isLicenseAllowed,
  redactSecretSnippet,
  scanSecretContent,
  shouldScanFile,
  tokenizeLicenseField,
} from "../../src/extension/securityScan.js";

describe("scanSecretContent", () => {
  it("flags private keys, aws access ids, and github tokens", () => {
    const findings = scanSecretContent(
      "src/bad.ts",
      [
        "-----BEGIN RSA PRIVATE KEY-----",
        "const access = 'AKIAIOSFODNN7EXAMPLE';",
        "const token = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';",
      ].join("\n"),
    );
    const ids = findings.map((f) => f.patternId);
    expect(ids).toContain("private_key");
    expect(ids).toContain("aws_access_key");
    expect(ids).toContain("github_token");
  });

  it("skips lines with allow pragma", () => {
    const findings = scanSecretContent(
      "src/fixture.ts",
      "const access = 'AKIAIOSFODNN7EXAMPLE'; // altai-secret-scan: allow",
    );
    expect(findings).toEqual([]);
  });

  it("flags hard-coded password assignments", () => {
    const findings = scanSecretContent(
      "src/cfg.ts",
      `password = "super-secret-value"`,
    );
    expect(
      findings.some((f) => f.patternId === "generic_api_key_assignment"),
    ).toBe(true);
  });
});

describe("shouldScanFile / redact", () => {
  it("skips tests, lockfile, and skip dirs", () => {
    expect(shouldScanFile("src/extension/activate.ts")).toBe(true);
    expect(shouldScanFile("test/unit/foo.test.ts")).toBe(false);
    expect(shouldScanFile("package-lock.json")).toBe(false);
    expect(shouldScanFile("node_modules/x/index.js")).toBe(false);
  });

  it("redacts quoted secrets in snippets", () => {
    expect(redactSecretSnippet(`apiKey = "abcdefghijklmnop"`)).toContain("***");
  });
});

describe("license allow list", () => {
  it("tokenizes OR expressions and rejects GPL", () => {
    expect(tokenizeLicenseField("(MIT OR Apache-2.0)")).toEqual([
      "MIT",
      "Apache-2.0",
    ]);
    expect(isLicenseAllowed("MIT")).toBe(true);
    expect(isLicenseAllowed("Apache-2.0")).toBe(true);
    expect(isLicenseAllowed("GPL-3.0-only")).toBe(false);
    expect(isLicenseAllowed(undefined)).toBe(false);
  });

  it("audits direct dependencies via resolver", () => {
    const findings = auditDirectDependencyLicenses({
      dependencies: {
        good: "1.0.0",
        bad: "1.0.0",
        missing: "1.0.0",
      },
      resolveLicense: (name) => {
        if (name === "good") return "MIT";
        if (name === "bad") return "GPL-3.0-only";
        return undefined;
      },
    });
    expect(findings.map((f) => f.packageName).sort()).toEqual([
      "bad",
      "missing",
    ]);
  });
});
