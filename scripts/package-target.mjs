#!/usr/bin/env node
/**
 * Build a single-target VSIX that contains exactly one native host tree.
 *
 * Usage:
 *   node scripts/package-target.mjs --target=darwin-arm64 --host=/path/to/altai-agent-host
 *   npm run package:target -- --target=linux-x64 --host=./altai-agent-host
 *
 * Staging goes to `.package/<target>/`, output to `./altai-<version>-<target>.vsix`
 * (or `--out-dir=`). Requires a prior `npm run build` (or full verify unless
 * `--skip-verify`).
 *
 * Pure path/naming rules live in src/extension/host/packageTarget.ts (tests).
 */
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SUPPORTED = new Set([
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "win32-x64",
]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function usage() {
  console.log(`Usage: node scripts/package-target.mjs --target=<target> [--host=<binary>] [--out-dir=<dir>] [--skip-verify]

Targets: ${[...SUPPORTED].join(", ")}

Stages a single-target extension tree under .package/<target>/ containing only
that target's native host (with .sha256), then runs vsce package.
`);
}

/** Recursively remove *.map files under a directory tree. */
function stripSourceMaps(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stripSourceMaps(full);
    } else if (entry.name.endsWith(".map")) {
      rmSync(full, { force: true });
    }
  }
}

/** @returns {{ target?: string, host?: string, outDir?: string, skipVerify: boolean, help: boolean }} */
function parseArgs(argv) {
  let target;
  let host;
  let outDir;
  let skipVerify = false;
  let help = false;
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--skip-verify") skipVerify = true;
    else if (arg.startsWith("--target=")) target = arg.slice("--target=".length);
    else if (arg.startsWith("--host=")) host = arg.slice("--host=".length);
    else if (arg.startsWith("--out-dir=")) outDir = arg.slice("--out-dir=".length);
    else if (!arg.startsWith("-") && !target) target = arg;
  }
  return { target, host, outDir, skipVerify, help };
}

const parsed = parseArgs(args);
if (parsed.help || !parsed.target) {
  usage();
  process.exit(parsed.help ? 0 : 1);
}

const target = parsed.target;
if (!SUPPORTED.has(target)) {
  console.error(`Unsupported target: ${target}`);
  usage();
  process.exit(1);
}

const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const version = packageJson.version;
if (typeof version !== "string" || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error("package.json version is invalid");
  process.exit(1);
}

const isWin = target.startsWith("win32");
const hostFileName = isWin ? "altai-agent-host.exe" : "altai-agent-host";
const vsixName = `altai-${version}-${target}.vsix`;
const stagingDir = path.join(root, ".package", target);
const outDir = parsed.outDir
  ? path.resolve(root, parsed.outDir)
  : root;
const outVsix = path.join(outDir, vsixName);

// Resolve host source
const hostOverride = parsed.host?.trim();
const packagedHost = path.join(
  root,
  "resources",
  "native",
  target,
  hostFileName,
);
const hostSource = hostOverride || packagedHost;
if (!existsSync(hostSource)) {
  console.error(
    `No host binary for ${target}.\n` +
      `  Pass --host=/absolute/path/to/${hostFileName}\n` +
      `  or place it at resources/native/${target}/${hostFileName}`,
  );
  process.exit(1);
}

if (!parsed.skipVerify) {
  console.log("Running npm run verify …");
  const verify = spawnSync("npm", ["run", "verify"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (verify.status !== 0) {
    process.exit(verify.status ?? 1);
  }
} else {
  // Still require built assets.
  for (const relative of [
    "dist/extension/extension.js",
    "dist/webview/main.js",
    "dist/webview/main.css",
  ]) {
    if (!existsSync(path.join(root, relative))) {
      console.error(`Missing ${relative}; run npm run build first.`);
      process.exit(1);
    }
  }
}

// Fresh staging tree
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

const entries = [
  "README.md",
  "LICENSE",
  ".vscodeignore",
  "dist",
  "media",
];
for (const entry of entries) {
  const from = path.join(root, entry);
  if (!existsSync(from)) {
    console.error(`Required packaging entry missing: ${entry}`);
    process.exit(1);
  }
  cpSync(from, path.join(stagingDir, entry), { recursive: true });
}

// Drop source maps from the staged tree (vsce !dist/** tends to re-include them).
stripSourceMaps(path.join(stagingDir, "dist"));

// Write package.json without vscode:prepublish so vsce does not rebuild
// from the stripped staging tree (no scripts/, no node_modules).
const stagedManifest = {
  ...packageJson,
  scripts: {
    ...(packageJson.scripts && typeof packageJson.scripts === "object"
      ? packageJson.scripts
      : {}),
    "vscode:prepublish": "node -e \"process.exit(0)\"",
  },
};
// Staging must not depend on sibling file: packages; built dist already embeds them.
delete stagedManifest.dependencies;
delete stagedManifest.devDependencies;
writeFileSync(
  path.join(stagingDir, "package.json"),
  `${JSON.stringify(stagedManifest, null, 2)}\n`,
  "utf8",
);

// Optional icons
const icons = path.join(root, "resources", "icons");
if (existsSync(icons)) {
  mkdirSync(path.join(stagingDir, "resources"), { recursive: true });
  cpSync(icons, path.join(stagingDir, "resources", "icons"), {
    recursive: true,
  });
}

// Stage single native host + checksum
const nativeDir = path.join(stagingDir, "resources", "native", target);
mkdirSync(nativeDir, { recursive: true });
const stagedHost = path.join(nativeDir, hostFileName);
copyFileSync(hostSource, stagedHost);
if (!isWin) {
  try {
    chmodSync(stagedHost, 0o755);
  } catch {
    // best-effort on platforms that ignore mode
  }
}
const digest = createHash("sha256").update(readFileSync(stagedHost)).digest("hex");
writeFileSync(`${stagedHost}.sha256`, `${digest}\n`, "utf8");

// Audit staged tree (require native, single target)
console.log(`Auditing staged package for ${target} …`);
const audit = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts", "verify-package-contents.mjs"),
    `--root=${stagingDir}`,
    "--require-native",
    `--target=${target}`,
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      ALTAI_REQUIRE_NATIVE_HOST: "1",
      ALTAI_PACKAGE_TARGET: target,
    },
    encoding: "utf8",
  },
);
if (audit.stdout) process.stdout.write(audit.stdout);
if (audit.stderr) process.stderr.write(audit.stderr);
if (audit.status !== 0) {
  console.error("Staged package audit failed.");
  process.exit(audit.status ?? 1);
}

// vsce package from staging directory
mkdirSync(outDir, { recursive: true });
if (existsSync(outVsix)) {
  rmSync(outVsix);
}

const vsceJs = path.join(
  root,
  "node_modules",
  "@vscode",
  "vsce",
  "vsce",
);
const vsceEntry = existsSync(vsceJs)
  ? vsceJs
  : path.join(root, "node_modules", "@vscode", "vsce", "out", "vsce");

// Prefer npx/vsce bin via npm exec for reliability across package layouts
console.log(`Packaging ${vsixName} …`);
const pack = spawnSync(
  "npx",
  [
    "--no-install",
    "vsce",
    "package",
    "--no-dependencies",
    "--allow-missing-repository",
    "--target",
    target,
    "--ignore-other-target-folders",
    "--out",
    outVsix,
  ],
  {
    cwd: stagingDir,
    stdio: "inherit",
    env: {
      ...process.env,
      // Prefer repo node_modules for npx resolution when staging has none
      PATH: process.env.PATH,
      NODE_PATH: path.join(root, "node_modules"),
    },
  },
);
if (pack.status !== 0) {
  console.error("vsce package failed.");
  process.exit(pack.status ?? 1);
}

if (!existsSync(outVsix)) {
  console.error(`Expected VSIX was not produced: ${outVsix}`);
  process.exit(1);
}

console.log(`Wrote ${path.relative(root, outVsix)}`);
console.log(`  host source: ${hostSource}`);
console.log(`  sha256: ${digest}`);
console.log(`  staging: ${path.relative(root, stagingDir)}`);
