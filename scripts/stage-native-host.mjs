#!/usr/bin/env node
/**
 * Stage a real native agent host into resources/native/<target>/ for packaging.
 *
 * Usage:
 *   node scripts/stage-native-host.mjs --target=linux-x64 --host=/path/to/altai-cli
 *   node scripts/stage-native-host.mjs --target=darwin-arm64 --host=../altai-app-main/src-tauri/target/release/altai-cli
 *
 * Writes:
 *   resources/native/<target>/altai-agent-host[.exe]
 *   resources/native/<target>/altai-agent-host[.exe].sha256
 *   updates resources/native/PIN.json sourceRevision when --revision= is set
 */
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
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

function arg(name) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

const target = arg("target");
const host = arg("host");
const revision = arg("revision");

if (!target || !host) {
  console.error(
    "Usage: node scripts/stage-native-host.mjs --target=<os-arch> --host=<binary> [--revision=<git-sha>]",
  );
  process.exit(1);
}

if (!SUPPORTED.has(target)) {
  console.error(`Unsupported target: ${target}`);
  process.exit(1);
}

const hostPath = path.resolve(host);
if (!existsSync(hostPath)) {
  console.error(`Host binary not found: ${hostPath}`);
  process.exit(1);
}

const isWin = target.startsWith("win32");
const fileName = isWin ? "altai-agent-host.exe" : "altai-agent-host";
const destDir = path.join(root, "resources", "native", target);
mkdirSync(destDir, { recursive: true });
const dest = path.join(destDir, fileName);
copyFileSync(hostPath, dest);
if (!isWin) {
  try {
    chmodSync(dest, 0o755);
  } catch {
    // ignore
  }
}

const digest = createHash("sha256").update(readFileSync(dest)).digest("hex");
writeFileSync(`${dest}.sha256`, `${digest}\n`, "utf8");

// Refresh PIN.json (keep agentHost / protocol from existing)
const pinPath = path.join(root, "resources", "native", "PIN.json");
let pin = {
  agentHost: "0.1.0-cli-stdio",
  protocolMajor: 1,
  sourcePackage: "altai-cli",
  notes:
    "Packaged binary is altai-cli built with serve --stdio. Stage via npm run stage:native-host.",
};
if (existsSync(pinPath)) {
  try {
    pin = { ...pin, ...JSON.parse(readFileSync(pinPath, "utf8")) };
  } catch {
    // keep defaults
  }
}
if (revision) {
  pin.sourceRevision = revision;
}
pin.stagedTargets = Array.from(
  new Set([...(Array.isArray(pin.stagedTargets) ? pin.stagedTargets : []), target]),
).sort();
writeFileSync(pinPath, `${JSON.stringify(pin, null, 2)}\n`, "utf8");

console.log(`Staged ${target} host → ${path.relative(root, dest)}`);
console.log(`  sha256: ${digest}`);
if (revision) {
  console.log(`  revision: ${revision}`);
}
