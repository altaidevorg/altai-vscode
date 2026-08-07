#!/usr/bin/env bash
# Launch Extension Development Host against THIS checkout only (avoids other worktrees).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "[altai-dev] root=$ROOT"
git rev-parse --short HEAD 2>/dev/null || true
npm run build
HOST="${ALTAI_AGENT_HOST_PATH:-$ROOT/../altai-app-main/src-tauri/target/debug/altai-cli}"
export ALTAI_AGENT_HOST_PATH="$HOST"
echo "[altai-dev] ALTAI_AGENT_HOST_PATH=$ALTAI_AGENT_HOST_PATH"

if command -v cursor >/dev/null 2>&1; then
  exec cursor --extensionDevelopmentPath="$ROOT" "$ROOT"
elif command -v code >/dev/null 2>&1; then
  exec code --extensionDevelopmentPath="$ROOT" "$ROOT"
else
  echo "Install Cursor or VS Code CLI (cursor / code) first." >&2
  exit 1
fi
