# ALTAI for Visual Studio Code

The official ALTAI extension for Visual Studio Code, powered by the shared
ALTAI UI and IsanAgent runtime.

This repository is intentionally a thin VS Code host. Shared chat UI, protocol
types, and the agent runtime are developed in
[`altaidevorg/altai-app`](https://github.com/altaidevorg/altai-app); the agent
engine is developed in
[`altaidevorg/isanagent`](https://github.com/altaidevorg/isanagent).

## Core rule

The VS Code extension must render the same shared `AiSidePanel` React package
as ALTAI Desktop. Do not create a second chat UI or copy Desktop JSX/CSS into
this repository.

## Status

**Internal preview (0.1.0).** CHAT + host ports (V4–V6): capability-gated
session/run, Work, Inbox, MCP, settings, and interactive review routes proxy
through the trusted native host.

Operations (V7): Chat/Operations surface tabs mount shared
`OperationsNavigationShell`. Overview aggregates Work/Inbox ports; Work /
Runs / Inbox domain lists enable only when the host advertises the matching
capabilities. Command palette deep-links (`ALTAI: Open Operations …`) focus
the panel and select the route. Overview attention/progress rows open the
matching Work/Runs/Inbox domain when that capability is available. Metric
tiles on Overview also navigate to the matching domain (host-wrapped
`InspectorMetric` until shared metric `onOpen` lands). Task runs and inbox
items can open Chat and focus a known owner conversation when `chatId` is
present; when `sessions.messages` is available the host loads that conversation's
transcript into the chat log. When `sessions.list` is available, Chat mounts a
shared `SessionRow` history list (New / rename / delete when those capabilities
are advertised). The composer mounts the shared permission-mode switcher when
settings + interactive.permissionModes capabilities are available, and
forwards the mode on startRun. The composer also mounts a shared model
picker (ComposerConfigTrigger + ModelOption) when models.list/select +
settings.get are available, writing the default model via settings.update.
When `settings.providerStatus` is available, Chat lists providers with Connect
(Extension Host password prompt — secrets never enter the Webview) and Clear.
Pending tool approvals and clarifications from
host `run/event` streams render shared `AiToolApproval` /
`ClarificationChoices` when interactive capabilities are available. Presentation
(Chat vs Operations, secondary route, Work hub strip, active chat id) survives
Webview reload via getState/setState, including Runs/Scheduled toggles on the
Work hub. Active
overview runs expose a Cancel action; failed
runs Retry and unread inbox Mark read. Attention count drives a status-bar
badge that opens Operations Inbox when the count is non-zero (Operations
overview when zero); the badge also refreshes while Chat is open
(Operations unmounted) via lifecycle/notification host events. A separate
host lifecycle badge appears when the agent host is connecting, disconnected,
or erroring (errors open Run Diagnostics). Work/Runs offer
a New task composer (createTaskRun)
and Scheduled offers a New automation composer (createAutomation). Command
palette includes **ALTAI: New Operations Task** and **New Operations Automation**.
Canonical CP-17 projections and full Tailwind visual parity are follow-on work.
See the [feature matrix](docs/FEATURE_MATRIX.md) for internal vs alpha gaps.

Local installs expect a sibling checkout of `altai-app` at
`../altai-app-main` so `file:` package links resolve (packages are not on npm
yet). Keep that checkout near `main` so A7+ `@altai/agent-ui` exports resolve.

See the [engineering plan](docs/ENGINEERING_PLAN.md) and
[protocol compatibility](docs/PROTOCOL_COMPATIBILITY.md).

## Documentation

- [ALTAI architecture overview](docs/ALTAI_ARCHITECTURE_OVERVIEW.md) — component
  responsibilities and the Desktop, VS Code, service, and IsanAgent data flow.
- [Engineering plan](docs/ENGINEERING_PLAN.md) — implementation phases and
  non-negotiable architecture rules.
- [Protocol compatibility](docs/PROTOCOL_COMPATIBILITY.md) — pinned extension,
  protocol, shared-package, and native-host versions.
- [Feature matrix](docs/FEATURE_MATRIX.md) — internal channel surface status.
- [Release guide](docs/RELEASE.md) — internal / alpha / beta / stable checklist.
- [Security and privacy](docs/SECURITY.md) — trust, secrets, host, logging.
- [Changelog](CHANGELOG.md) — shipped user-visible changes per version.


## Shortcuts

| Action | Default keybinding |
|---|---|
| Open Side Panel | Cmd/Ctrl+Shift+Alt+A |
| Open Settings (panel) | Cmd/Ctrl+Alt+, |
| Ask About Selection | Cmd/Ctrl+Alt+A |
| Ask About Active File | Cmd/Ctrl+Alt+F |
| Ask About Working Tree | Cmd/Ctrl+Alt+G |
| Ask About Terminal | Cmd/Ctrl+Alt+T (terminal focused) |
| Ask About Problems | Cmd/Ctrl+Alt+P |
| Pick Project Root | Command palette (multi-root) |
| Copy Diagnostics Report | Command palette / panel menu |
| Open Operations | Cmd/Ctrl+Shift+Alt+O |
| Open Inbox | Cmd/Ctrl+Shift+Alt+I |
| Open Logs | Cmd/Ctrl+Shift+Alt+L |
| Run Diagnostics | Cmd/Ctrl+Shift+Alt+D |
| Restart Host | Cmd/Ctrl+Shift+Alt+R |

Command palette also exposes provider connect/clear, walkthrough, and deep-links.

## Develop

Layout (sibling packages):

```text
Desktop/
  altai-vscode/       # this repo
  altai-app-main/     # altaidevorg/altai-app checkout
```

```bash
npm install
npm run verify
```

Then open this folder in VS Code / Cursor and launch **Run ALTAI Extension**
(Extension Development Host). The ALTAI Activity Bar view should show the
shared UI shell (not a second chat implementation).

For a local agent host while the packaged binary is not in the VSIX yet,
**Run ALTAI Extension** sets:

```text
ALTAI_AGENT_HOST_PATH=${workspaceFolder}/../altai-app-main/src-tauri/target/debug/altai-cli
```

Build that binary once if missing:

```bash
cd ../altai-app-main/src-tauri && cargo build -p altai-cli
```

Or set **ALTAI: Agent Host Path** (`altai.agentHostPath`) in VS Code settings
to an absolute `altai-cli` / host binary. Empty means packaged host (or
`ALTAI_AGENT_HOST_PATH` when set).

Useful scripts:

| Script | Purpose |
|---|---|
| `npm run typecheck` | Strict TypeScript for extension + webview |
| `npm run lint` | ESLint, including no-`vscode` in webview |
| `npm test` | Unit tests |
| `npm run build` | Bundle extension host + webview |
| `npm run guard:architecture` | Ban host imports / copied UI symbols |
| `npm run verify:package` | Manifest + built assets + native host layout audit |
| `npm run verify:vsix` | Audit a packaged `.vsix` for single-target host layout |
| `npm run verify:security` | Secret pattern scan + direct dependency license audit |
| `npm run verify:release-docs` | CHANGELOG version section + RELEASE.md checklist gate |
| `npm run package:target` | Stage one OS/arch + native host, emit target VSIX |
| `npm run verify` | All of the above (including package + security + release docs) |

Remote workspaces (SSH, WSL, Dev Containers): the extension declares
`extensionKind: workspace` so the native agent host runs on the **remote**
machine next to the workspace filesystem — not as a UI-only local extension.

### Target VSIX packaging

Release packages ship **one** native host per artifact
(`resources/native/<target>/altai-agent-host[.exe]` + `.sha256`):

```bash
npm run build
npm run package:target -- --target=darwin-arm64 --host=/path/to/altai-agent-host
# → altai-0.1.0-darwin-arm64.vsix
```

Supported targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `win32-x64`.
Staging lands in `.package/<target>/`. Use `--skip-verify` only when verify
already passed and you are iterating on packaging.

Audit a produced artifact:

```bash
npm run verify:vsix -- --vsix=altai-0.1.0-linux-x64.vsix --target=linux-x64
```

CI (`package.yml`) builds fixture VSIX artifacts for every supported target on
`main` and packaging-related PRs (real signed host binaries land with release
pinning).

## Architecture

```text
Webview (dist/webview)  --typed postMessage-->  Extension Host
                                                      |
                                              JSON-RPC stdio (Content-Length)
                                                      |
                                              altai-cli serve / altai-agent-host
```

The always-on [Cursor Project Rule](.cursor/rules/altai-engineering.mdc)
protects these boundaries while the plan is implemented.
