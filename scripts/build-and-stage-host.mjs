#!/usr/bin/env node
/**
 * Build altai-cli (release) from sibling altai-app and stage as native host.
 *
 * Usage:
 *   node scripts/build-and-stage-host.mjs --target=linux-x64
 *   ALTAI_APP_ROOT=../altai-app-main node scripts/build-and-stage-host.mjs --target=darwin-arm64
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const targetArg = args.find((a) => a.startsWith("--target="));
const target = targetArg?.slice("--target=".length);
const rustTarget = {
  "darwin-arm64": "aarch64-apple-darwin",
  "darwin-x64": "x86_64-apple-darwin",
}[target];

if (!target) {
  console.error("Usage: node scripts/build-and-stage-host.mjs --target=<os-arch>");
  process.exit(1);
}

const appRoot = path.resolve(
  process.env.ALTAI_APP_ROOT || path.join(root, "..", "altai-app-main"),
);
const manifest = path.join(appRoot, "src-tauri", "Cargo.toml");
if (!existsSync(manifest)) {
  console.error(`altai-app Cargo manifest not found: ${manifest}`);
  console.error("Set ALTAI_APP_ROOT to an altai-app checkout.");
  process.exit(1);
}

console.log(`Building altai-cli --release in ${appRoot} …`);
const build = spawnSync(
  "cargo",
  [
    "build",
    "--manifest-path",
    manifest,
    "-p",
    "altai-cli",
    "--release",
    ...(rustTarget ? ["--target", rustTarget] : []),
  ],
  { cwd: appRoot, stdio: "inherit", env: process.env },
);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const isWin = target.startsWith("win32");
const builtName = isWin ? "altai-cli.exe" : "altai-cli";
const cargoTargetDir = process.env.CARGO_TARGET_DIR || path.join(appRoot, "src-tauri", "target");
const built = path.join(
  cargoTargetDir,
  ...(rustTarget ? [rustTarget] : []),
  "release",
  builtName,
);
if (!existsSync(built)) {
  console.error(`Built binary missing: ${built}`);
  process.exit(1);
}

let revision = process.env.ALTAI_APP_REVISION;
if (!revision) {
  const rev = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: appRoot,
    encoding: "utf8",
  });
  if (rev.status === 0) {
    revision = rev.stdout.trim();
  }
}

const stageArgs = [
  path.join(root, "scripts", "stage-native-host.mjs"),
  `--target=${target}`,
  `--host=${built}`,
];
if (revision) {
  stageArgs.push(`--revision=${revision}`);
}

const stage = spawnSync(process.execPath, stageArgs, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(stage.status ?? 1);
