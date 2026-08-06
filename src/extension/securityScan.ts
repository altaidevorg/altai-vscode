/**
 * High-confidence secret pattern scan (V7 / ENGINEERING_PLAN §13.12).
 * Pure matchers for unit tests; CLI walks on-disk sources.
 */
export type SecretPattern = {
  id: string;
  description: string;
  /** Applied after comment/string allowlist lines are stripped where noted. */
  pattern: RegExp;
};

export type SecretFinding = {
  file: string;
  line: number;
  patternId: string;
  description: string;
  /** Redacted snippet for logs (never full match). */
  snippet: string;
};

export const SECRET_PATTERNS: readonly SecretPattern[] = [
  {
    id: "private_key",
    description: "PEM/OpenSSH private key block",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    id: "aws_access_key",
    description: "AWS access key id",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: "github_token",
    description: "GitHub token (ghp_/gho_/ghu_/ghs_/ghr_)",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  },
  {
    id: "slack_token",
    description: "Slack API token",
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
  },
  {
    id: "generic_api_key_assignment",
    description: "Hard-coded credential assignment",
    pattern:
      /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|password)\s*[:=]\s*['"][^'"]{12,}['"]/i,
  },
];

/** Paths relative to repo root that must never be scanned (noise / generated). */
export const SECRET_SCAN_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "out",
  ".git",
  ".package",
  "artifacts",
  "coverage",
  ".vscode-test",
]);

/**
 * File extensions scanned for secrets.
 */
export const SECRET_SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".html",
  ".css",
  ".sh",
  ".env",
  ".txt",
]);

/**
 * Redact a match for log output: keep first/last 2 chars max of the secret-ish span.
 */
export function redactSecretSnippet(line: string, max = 80): string {
  const trimmed = line.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) {
    return trimmed.replace(/(['"])[^'"]{8,}\1/g, "$1***$1");
  }
  return `${trimmed.slice(0, max - 1)}…`.replace(
    /(['"])[^'"]{8,}\1/g,
    "$1***$1",
  );
}

/**
 * Scan file contents for secret patterns.
 * Lines containing `altai-secret-scan: allow` are skipped (documented fixtures only).
 */
export function scanSecretContent(
  filePath: string,
  content: string,
  patterns: readonly SecretPattern[] = SECRET_PATTERNS,
): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.includes("altai-secret-scan: allow")) {
      continue;
    }
    for (const pattern of patterns) {
      // Reset lastIndex for global flags if ever used
      pattern.pattern.lastIndex = 0;
      if (pattern.pattern.test(line)) {
        findings.push({
          file: filePath,
          line: i + 1,
          patternId: pattern.id,
          description: pattern.description,
          snippet: redactSecretSnippet(line),
        });
      }
    }
  }
  return findings;
}

export function shouldScanFile(
  relativePath: string,
  options?: { includeTests?: boolean },
): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  if (parts.some((part) => SECRET_SCAN_SKIP_DIRS.has(part))) {
    return false;
  }
  if (!options?.includeTests && (parts.includes("test") || parts.includes("__tests__"))) {
    return false;
  }
  if (normalized === "package-lock.json") {
    return false;
  }
  const base = parts[parts.length - 1] ?? "";
  if (base === ".env" || base.startsWith(".env.")) {
    return true;
  }
  const dot = base.lastIndexOf(".");
  if (dot < 0) {
    return false;
  }
  return SECRET_SCAN_EXTENSIONS.has(base.slice(dot).toLowerCase());
}

/**
 * Runtime license ids allowed for production dependencies in this extension.
 * Case-insensitive; SPDX OR expressions accepted when every license is allowed.
 */
export const ALLOWED_LICENSE_IDS = new Set([
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

export const DISALLOWED_LICENSE_IDS = new Set([
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

export type LicenseFinding = {
  packageName: string;
  license: string;
  reason: string;
};

/**
 * Parse a package license field into license tokens.
 */
export function tokenizeLicenseField(raw: string): string[] {
  return raw
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND)\s+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function isLicenseAllowed(raw: string | undefined): boolean {
  if (!raw || !raw.trim()) {
    return false;
  }
  const tokens = tokenizeLicenseField(raw);
  if (tokens.length === 0) {
    return false;
  }
  // Disallow if any token is explicitly forbidden.
  for (const token of tokens) {
    if (DISALLOWED_LICENSE_IDS.has(token.toLowerCase())) {
      return false;
    }
  }
  // Allow when every token is on the allow list (strict for multi-license).
  return tokens.every((token) => ALLOWED_LICENSE_IDS.has(token.toLowerCase()));
}

/**
 * Evaluate direct production dependency licenses from a package.json deps map
 * and a function that resolves license strings.
 */
export function auditDirectDependencyLicenses(options: {
  dependencies: Record<string, string>;
  resolveLicense: (name: string) => string | undefined;
}): LicenseFinding[] {
  const findings: LicenseFinding[] = [];
  for (const name of Object.keys(options.dependencies).sort()) {
    const license = options.resolveLicense(name);
    if (!isLicenseAllowed(license)) {
      findings.push({
        packageName: name,
        license: license ?? "(missing)",
        reason: license
          ? "license not on allow list or contains a disallowed SPDX id"
          : "license metadata missing for dependency",
      });
    }
  }
  return findings;
}
