# Desktop Chat UI Parity Plan

Status: **active program** (Phase 3 / TASK-007 of ENGINEERING_PLAN)  
Owners: `altai-app` (extract + Desktop), `altai-vscode` (thin host mount)  
Last updated: 2026-08-07

## Problem

VS Code mounts a composite shell (`AltaiApp` / `AgentUiShell`) that **assembles**
`@altai/agent-ui` pieces. Desktop mounts **`AiSidePanel`** (still in
`altai-app/src/modules/ai/components/`) with chat stores, inspectors, and
full layout. Users correctly see that the plugin does not look or behave like
ALTAI Desktop.

## Non-negotiables

1. One React tree: extract `AiSidePanel` + children into `@altai/agent-ui`.
2. No second chat UI in `altai-vscode`; host only supplies ports + chrome width.
3. Desktop must keep working while consuming the package (no dual sources).
4. Visible controls remain capability-gated through `HostPorts`.
5. Secrets / IsanAgent / shell stay off the Webview.

## Target architecture

```text
                    @altai/agent-ui
           AiSidePanel + EmptyState + composers + ...
                          |
           HostPortsProvider (inject ports + capabilities)
              /                      \
     TauriHostPorts              VsCodeHostPorts
     (altai-app)                 (altai-vscode webview)
```

## Phased delivery

### P0 — Stop VS Code bleeding (**landed** 2026-08-07, PR #208)

| Item | Repo | Notes |
|---|---|---|
| Narrow Activity Bar layout | vscode | Stack history above chat; collapsible Sessions |
| Humanize host error codes | vscode | `journal_unavailable`, `unsupported_config_patch`, … |
| CSS container query for wide secondary sidebar | vscode | Side-by-side only ≥ 36rem |

### P1 — Shared layout primitive (**AgentChatLayout landed** — altai-app #408)

| Item | Repo | Acceptance |
|---|---|---|
| Export `AgentChatLayout` (slots: history, main) with `density: "sidebar" \| "desktop"` | agent-ui | Unit test ✓ |
| VS Code mounts `AgentChatLayout` | vscode | PR #208 ✓ |
| Desktop `AiSidePanel` history\|main migrate off ad-hoc markup where resizable allows | altai-app | **next** |

### P2 — Port-backed session surface (**in progress** 2026-08-07)

| Item | Repo | Acceptance |
|---|---|---|
| History mutations only via `ports.sessions.*` inside agent-ui container | agent-ui | next |
| Soft-fail journal: empty history UI, not raw codes | vscode | P0 humanize ✓ |
| Align `config/update` patches (camelCase aliases + ignore noise) | altai-cli | PR follow-up |
| `AgentChatLayout` density=`auto` | agent-ui + vscode | ResizeObserver switch |

### P3 — Extract `AiSidePanel` tree

Order (keep each PR reviewable):

1. Presentational-only components already mostly in agent-ui — inventory gaps.
2. Move `AiInputBar` wiring to HostPorts (no Tauri `native` in UI).
3. Move `AiChat` message list + stream subscription to shared event bridge
   injected via ports / adapter.
4. Move Zustand stores used only by chat **or** invert: panel props + hooks
   that call ports (prefer ports over sharing store implementations).
5. Extract `AiSidePanel` itself last; Desktop imports from package.
6. VS Code deletes `AgentUiShell` chat assembly and mounts `<AiSidePanel />`.

### P4 — Visual + behavior gates

- VS Code inherits Desktop lime primary accent (2026-08-07 polish)
- Pixel baselines Desktop light/dark (existing tooling).
- VS Code webview screenshot smoke at 320px and 560px width.
- Capability matrix: same controls hidden/disabled when host deferred.
- Integration: startRun stream, approval, plan exit, session list.

### P5 — Hardening

- Theme: ALTAI tokens with IDE contrast (not “paint everything vscode-gray”).
- Reduced-motion / contrast / keyboard paths.
- Drop obsolete host shells after mount lands.

## Explicit non-goals (for this program)

- Cloning Desktop window chrome, titlebar, or multi-window settings into VS Code.
- Marketplace or signed-host work (parallel track).
- Pure `vscode.dev` without native host.

## Immediate next code slice after P0

1. **agent-ui:** add `AgentChatLayout` + density CSS variables.
2. **altai-app:** replace only the outer history/main split markup with it.
3. **altai-vscode:** replace `.altai-chat-layout` hierarchy with the same component.
4. **altai-cli:** audit `config/update` + journal open errors; fix path/mkdir if
   journal fails on fresh workspace (pairs with history UX).

## Risk register

| Risk | Mitigation |
|---|---|
| Store/Tauri coupling in `AiSidePanel` | Ports-first extraction; no packaging of Tauri APIs |
| VS Code keeps forking chrome during extract | Freeze new VS Code chat features after P0; new UI only in agent-ui |
| Stdio capability lag vs Desktop | Capability gate + human errors; never dead buttons |

## Definition of done (Desktop parity)

- Desktop and VS Code render `AiSidePanel` from the same package entry.
- No `AgentUiShell` chat rebuild remains in vscode.
- Narrow and wide screens usable; no raw host codes in panel.
- ENGINEERING_PLAN Phase 3–4 exit gates for chat surface green.
