# Feature matrix (internal channel)

Status for the **0.1.0 internal** ALTAI VS Code host against ENGINEERING_PLAN
V4–V7 / TASK-012 surfaces. Codes:

| Code | Meaning |
|---|---|
| **G** | Green — implemented and capability-gated in this repo |
| **Y** | Yellow — partial or depends on host/package publish outside this repo |
| **R** | Red — not in scope for 0.1.0 internal |

## Host foundations

| Area | Status | Notes |
|---|:---:|---|
| Extension activate + Activity Bar Webview | G | |
| Workspace Trust gates native host | G | untrusted = no host spawn |
| Stdio JSON-RPC host manager | G | |
| Capability store + gated UI | G | no dead enabled controls |
| Architecture guard (no Desktop UI copy) | G | `guard:architecture` |
| Diagnostics + recovery hints | G | `ALTAI: Run Diagnostics` |
| Remote extensionKind `workspace` | G | SSH/WSL/Dev Container EH |
| Virtual workspaces limited | G | |

## Chat (shared `@altai/agent-ui`)

| Area | Status | Notes |
|---|:---:|---|
| Mount HostPortsProvider + shared surfaces | G | |
| Sessions list / new / rename / delete | G | cap-gated |
| Start run / stream events / cancel | G | when host Ready |
| Permission mode on composer | G | |
| Model picker | G | |
| Provider status Connect/Clear | G | secrets via EH only |
| Interactive approval / clarification | G | |
| Diff / open file / workspace ports | G | VS Code adapters |
| Full Desktop visual parity / Tailwind density | Y | follow-on polish |

## Operations

| Area | Status | Notes |
|---|:---:|---|
| Overview (metrics, attention rows) | G | |
| Work / Runs / Inbox / Scheduled | G | cap-gated domains |
| New task / new automation composers | G | |
| Attention status-bar badge + poll | G | |
| Ops → Chat deep-link + transcript | G | |
| Command palette deep-links | G | |

## Packaging & release hardening

| Area | Status | Notes |
|---|:---:|---|
| Package-content audit | G | `verify:package` |
| Single-target VSIX (`package:target`) | G | needs real host for alpha |
| Multi-target fixture package CI | G | fixture binaries only |
| VSIX entry audit (`verify:vsix`) | G | |
| Secret + license scan | G | `verify:security` |
| CHANGELOG + RELEASE checklist gate | G | `verify:release-docs` |
| Real signed host pin per target | Y | release pipeline outside this repo |
| npm-published shared UI packages | Y | `file:` siblings today |
| Marketplace stable listing | R | internal/preview only |
| Automated Remote e2e CI | Y | manual checklist in RELEASE.md |
| Visual / a11y regression suite | Y | not automated yet |

## Explicitly out of v1

| Area | Status | Notes |
|---|:---:|---|
| `vscode.dev` / pure web | R | cannot spawn native host |
| Copied second chat UI | R | forbidden by architecture |

When promoting to **alpha**, every **Y** packaging row for host pin and real VSIX
must move to **G** using [RELEASE.md](RELEASE.md).
