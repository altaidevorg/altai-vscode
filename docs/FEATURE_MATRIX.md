# Feature matrix (0.1.0 channel)

Status for the ALTAI VS Code host against ENGINEERING_PLAN V4–V7 / TASK-012.

| Code | Meaning |
|---|---|
| **G** | Green — implemented in this repo and gated in CI |
| **Y** | Yellow — machinery present; requires org secrets / registry action |
| **R** | Red — out of scope for this channel |

## Host foundations

| Area | Status | Notes |
|---|:---:|---|
| Trust-gated native host + stdio RPC | G | |
| Capability-gated Chat + Operations | G | |
| Diagnostics + recovery + PIN dump | G | host status bar, copy report, virtual/no-workspace codes |
| Command palette / menu deep-links | G | Ask About *, Settings, Ops, recovery |
| Getting Started walkthrough | G | trust / open / connect / diagnostics; first-activate one-shot |
| Remote `extensionKind: workspace` | G | |
| Host pin (`PIN.json` + COMPATIBILITY) | G | `verify:host-pin` |
| Stage / build native host scripts | G | `stage:native-host`, `build:native-host` |
| Multi-OS real host VSIX (`release.yml`) | G | workflow_dispatch / tags |
| Fixture package matrix (`package.yml`) | G | PR packaging invariant |
| Integration packaging smoke | G | `integration.yml` |

## Chat / Operations / security docs

| Area | Status | Notes |
|---|:---:|---|
| Shared UI chat surfaces | G | |
| Operations shell | G | |
| Secret + license scan | G | |
| a11y shell (CSP, landmark, reduced-motion) | G | unit smoke |

## External org actions

| Area | Status | Notes |
|---|:---:|---|
| npm publish `@altai/agent-ui` / `host-contract` | Y | scripts in altai-app; needs NPM_TOKEN |
| Marketplace **pre-release** publish | Y | `vsce publish --pre-release` + `VSCE_PAT` |
| Marketplace **stable** | Y | after alpha soak; drop `"preview": true` |
| Live Remote SSH e2e against fleet | Y | checklist in RELEASE.md |
| Signed host signatures beyond sha256 | Y | org signing pipeline |

For the sequenced program that turns remaining **Y** cells and host-side product
gaps into green work, see [UNLOCK_PLAN.md](UNLOCK_PLAN.md).

## Out of v1

| Area | Status | Notes |
|---|:---:|---|
| `vscode.dev` pure web | R | no native host spawn |
| Second chat UI fork | R | architecture ban |
