#!/usr/bin/env node
/**
 * Architecture guard for TASK-001+.
 * - Webview sources must not import vscode / @tauri-apps
 * - Built webview bundle must not contain a vscode require/import
 * - Repository must not contain copied ALTAI Desktop chat JSX/CSS
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];

async function walk(dir, predicate) {
  /** @type {string[]} */
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "out" ||
        entry.name === ".git"
      ) {
        continue;
      }
      files.push(...(await walk(full, predicate)));
    } else if (predicate(full)) {
      files.push(full);
    }
  }
  return files;
}

const webviewSources = await walk(path.join(root, "src", "webview"), (f) =>
  /\.(ts|tsx|js|jsx|css)$/.test(f),
);
const sharedSources = await walk(path.join(root, "src", "shared"), (f) =>
  /\.(ts|tsx)$/.test(f),
);

const bannedImport = /from\s+["']vscode["']|require\(\s*["']vscode["']\)|from\s+["']@tauri-apps\//;

for (const file of [...webviewSources, ...sharedSources]) {
  const text = await readFile(file, "utf8");
  if (bannedImport.test(text)) {
    failures.push(`${path.relative(root, file)}: forbidden host import`);
  }
}

/**
 * Hosts may import and mount shared `@altai/agent-ui` surfaces. Block only a
 * local reimplementation that would fork the product UI.
 */
const localUiDefinition =
  /(?:export\s+)?(?:async\s+)?function\s+(AiSidePanel|AiChatView|AiInputBar|WorkHubPanel|NotificationInboxPanel)\b|(?:export\s+)?const\s+(AiSidePanel|AiChatView|AiInputBar|WorkHubPanel|NotificationInboxPanel)\s*=|(?:export\s+)?class\s+(AiSidePanel|AiChatView|AiInputBar|WorkHubPanel|NotificationInboxPanel)\b/;

const allSources = await walk(path.join(root, "src"), (f) =>
  /\.(ts|tsx|js|jsx|css)$/.test(f),
);

for (const file of allSources) {
  const text = await readFile(file, "utf8");
  const match = text.match(localUiDefinition);
  if (match) {
    const name = match[1] ?? match[2] ?? match[3] ?? "unknown";
    failures.push(
      `${path.relative(root, file)}: contains copied ALTAI UI symbol "${name}"`,
    );
  }
}

try {
  const bundlePath = path.join(root, "dist", "webview", "main.js");
  await stat(bundlePath);
  const bundle = await readFile(bundlePath, "utf8");
  if (
    /\bfrom\s*["']vscode["']/.test(bundle) ||
    /\brequire\(\s*["']vscode["']\s*\)/.test(bundle) ||
    /\bimport\(\s*["']vscode["']\s*\)/.test(bundle)
  ) {
    failures.push("dist/webview/main.js: vscode import detected in Webview bundle");
  }
} catch {
  failures.push("dist/webview/main.js missing — run build before guard:architecture");
}

if (failures.length > 0) {
  console.error("Architecture guard failed:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("Architecture guard passed.");
