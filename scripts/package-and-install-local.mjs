#!/usr/bin/env node
/**
 * Local developer loop: build → single-target VSIX → install into Cursor/VS Code.
 *
 * Usage:
 *   npm run package:local
 *   npm run package:local -- --no-install
 *   npm run package:local -- --skip-build
 *   ALTAI_AGENT_HOST_PATH=/path/to/altai-cli npm run package:local
 *
 * Detects current OS/arch, packages `altai-<version>-<target>.vsix` at the repo
 * root, and installs it with `cursor` or `code` so the Activity Bar panel shows
 * the latest build without an Extension Development Host.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const noInstall = args.has("--no-install");
const skipBuild = args.has("--skip-build");

function detectTarget() {
  const platform = process.platform;
  const arch =
    process.arch === "arm64" ? "arm64" : process.arch === "x64" ? "x64" : null;
  if (!arch) {
    throw new Error(`Unsupported CPU arch: ${process.arch}`);
  }
  if (platform === "darwin") return `darwin-${arch}`;
  if (platform === "linux") {
    if (arch !== "x64") {
      throw new Error(`Linux packaging only supports x64 (got ${arch})`);
    }
    return "linux-x64";
  }
  if (platform === "win32") {
    if (arch !== "x64") {
      throw new Error(`Windows packaging only supports x64 (got ${arch})`);
    }
    return "win32-x64";
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function resolveHostBinary(target) {
  const candidates = [];
  if (process.env.ALTAI_AGENT_HOST_PATH?.trim()) {
    candidates.push(path.resolve(process.env.ALTAI_AGENT_HOST_PATH.trim()));
  }
  const isWin = target.startsWith("win32");
  const packagedName = isWin ? "altai-agent-host.exe" : "altai-agent-host";
  candidates.push(
    path.join(root, "resources", "native", target, packagedName),
    path.join(root, "../altai-app-main/src-tauri/target/debug/altai-cli"),
    path.join(root, "../altai-app-main/src-tauri/target/release/altai-cli"),
    path.join(root, "../altai-app/src-tauri/target/debug/altai-cli"),
    path.join(root, "../altai-app/src-tauri/target/release/altai-cli"),
  );
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    [
      "No altai-cli / agent host binary found.",
      "Build one once:",
      "  cd ../altai-app-main/src-tauri && cargo build -p altai-cli",
      "Or set ALTAI_AGENT_HOST_PATH to the binary.",
    ].join("\n"),
  );
}

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function findCli() {
  const macCursor = "/Applications/Cursor.app/Contents/Resources/app/bin/cursor";
  if (existsSync(macCursor)) {
    return macCursor;
  }
  for (const bin of ["cursor", "code"]) {
    const result = spawnSync("which", [bin], { encoding: "utf8" });
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim().split("\n")[0];
    }
  }
  return null;
}

try {
  const target = detectTarget();
  const host = resolveHostBinary(target);
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  );
  const version = packageJson.version;
  const vsixPath = path.join(root, `altai-${version}-${target}.vsix`);

  console.log(`[package:local] target=${target}`);
  console.log(`[package:local] host=${host}`);
  console.log(`[package:local] version=${version}`);

  if (!skipBuild) {
    console.log("[package:local] npm run build …");
    run("npm", ["run", "build"]);
  }

  console.log("[package:local] packaging VSIX …");
  run("node", [
    path.join(root, "scripts", "package-target.mjs"),
    `--target=${target}`,
    `--host=${host}`,
    "--skip-verify",
  ]);

  if (!existsSync(vsixPath)) {
    console.error(`[package:local] expected ${vsixPath}`);
    process.exit(1);
  }

  console.log(`[package:local] wrote ${vsixPath}`);

  if (noInstall) {
    console.log("[package:local] skip install (--no-install)");
    console.log(
      `Install manually:\n  cursor --install-extension "${vsixPath}" --force`,
    );
    process.exit(0);
  }

  const installer = findCli();
  if (!installer) {
    console.error(
      "[package:local] neither `cursor` nor `code` CLI found on PATH.\n" +
        `Install from VSIX UI → ${vsixPath}`,
    );
    process.exit(0);
  }

  console.log(`[package:local] installing with ${installer} …`);
  run(installer, ["--install-extension", vsixPath, "--force"]);
  console.log(
    [
      "",
      "[package:local] done.",
      "1) Developer: Reload Window (or restart Cursor)",
      "2) Activity Bar → ALTAI (parent window — not only an old EDH window)",
      "3) Extensions: altai @ " + version,
      "",
    ].join("\n"),
  );
} catch (err) {
  console.error(`[package:local] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
