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

Phase 0 / TASK-006: Native host manager with trust-gated spawn of
`altai-cli serve --stdio`, Content-Length JSON-RPC framing, and distinct
lifecycle diagnostics. Shared `@altai/agent-ui` chat is not wired yet.

See the [engineering plan](docs/ENGINEERING_PLAN.md) and
[protocol compatibility](docs/PROTOCOL_COMPATIBILITY.md).

## Develop

```bash
npm install
npm run verify
```

Then open this folder in VS Code / Cursor and launch **Run ALTAI Extension**
(Extension Development Host).

For a local agent host while the packaged binary is not in the VSIX yet:

```bash
export ALTAI_AGENT_HOST_PATH=/path/to/altai-cli
```

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
                                              JSON-RPC stdio (Content-Length)
                                                      |
                                              altai-cli serve / altai-agent-host
```

The always-on [Cursor Project Rule](.cursor/rules/altai-engineering.mdc)
protects these boundaries while the plan is implemented.
