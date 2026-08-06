#!/usr/bin/env node
/**
 * Secret pattern scan over extension sources (V7).
 * Mirrors rules in src/extension/securityScan.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "out",
  ".git",
  ".package",
  "artifacts",
  "coverage",
  ".vscode-test",
]);

const EXTENSIONS = new Set([
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

const PATTERNS = [
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
    description: "GitHub token",
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

function shouldScan(rel) {
  const parts = rel.split("/");
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  if (parts.includes("test") || parts.includes("__tests__")) return false;
  if (rel === "package-lock.json") return false;
  const base = parts[parts.length - 1] ?? "";
  if (base === ".env" || base.startsWith(".env.")) return true;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return false;
  return EXTENSIONS.has(base.slice(dot).toLowerCase());
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && shouldScan(rel)) {
      out.push(full);
    }
  }
  return out;
}

function redact(line) {
  const trimmed = line.trim().replace(/\s+/g, " ");
  const redacted = trimmed.replace(/(['"])[^'"]{8,}\1/g, "$1***$1");
  return redacted.length > 80 ? `${redacted.slice(0, 79)}…` : redacted;
}

const files = walk(root);
/** @type {{file:string,line:number,id:string,description:string,snippet:string}[]} */
const findings = [];

for (const file of files) {
  let content;
  try {
    const stats = statSync(file);
    if (stats.size > 2_000_000) continue;
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.includes("altai-secret-scan: allow")) continue;
    for (const p of PATTERNS) {
      p.pattern.lastIndex = 0;
      if (p.pattern.test(line)) {
        findings.push({
          file: rel,
          line: i + 1,
          id: p.id,
          description: p.description,
          snippet: redact(line),
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed:");
  for (const f of findings) {
    console.error(
      `  ${f.file}:${f.line} [${f.id}] ${f.description} — ${f.snippet}`,
    );
  }
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} files).`);
