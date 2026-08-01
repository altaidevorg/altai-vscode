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

Phase 0 / TASK-001 foundation: Activity Bar Webview shell with a neutral
**ALTAI host not connected** state, CSP, typed message envelopes, and quality
scripts. Shared UI and the native host are not connected yet.

See the [engineering plan](docs/ENGINEERING_PLAN.md) and
[protocol compatibility](docs/PROTOCOL_COMPATIBILITY.md).

## Develop

```bash
npm install
npm run verify
```

Then open this folder in VS Code / Cursor and launch **Run ALTAI Extension**
(Extension Development Host).

Useful scripts:

| Script | Purpose |
|---|---|
| `npm run typecheck` | Strict TypeScript for extension + webview |
| `npm run lint` | ESLint, including no-`vscode` in webview |
| `npm test` | Unit tests |
| `npm run build` | Bundle extension host + webview |
| `npm run guard:architecture` | Ban host imports / copied UI symbols |
| `npm run verify` | All of the above |

## Architecture

```text
Webview (dist/webview)  --typed postMessage-->  Extension Host
                                                      |
                                              (later) JSON-RPC stdio
                                                      |
                                              altai-agent-host (Rust)
```

The always-on [Cursor Project Rule](.cursor/rules/altai-engineering.mdc)
protects these boundaries while the plan is implemented.
