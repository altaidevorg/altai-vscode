# Remaining work plan — pure A6 chrome drained (through A6.268)

Status: active  
Owners: `altai-app` (product UI, protocol, Rust host), `altai-vscode` (thin adapter)  
Related: [UNLOCK_PLAN.md](UNLOCK_PLAN.md), [ENGINEERING_PLAN.md](ENGINEERING_PLAN.md), [FEATURE_MATRIX.md](FEATURE_MATRIX.md)

**Pure dual-chrome helpers (A6)** for Desktop AI label/copy micro-extracts are **drained through A6.268**
on `altai-app` main (inventory of host-component user-facing strings is empty aside from comments).
This document sequences **everything still required** for production unlock (R1–R8),
with one acceptance gate per PR.

## 0. Current baseline (verified 2026-08-10)

| Track | State |
|---|---|
| Pure chrome `agent-ui` libs | **A6 pure-label drain complete** through A6.268; shared Markdown, panel frame, topbar, surface tabs, chat column, composer frame and draft persistence are exported |
| VS Code host mirrors | Webview uses the shared helpers/frames; Extension Host retains its non-React pure mirrors by design |
| Dual shell | VS Code still owns large `AltaiApp.tsx` orchestration and host-specific composite adapters, but mounts shared panel, chat-column, topbar and surface-tabs frames |
| Desktop | `AiSidePanel` uses shared frame/topbar/chat column/composer primitives; it still owns Resizable layout and Zustand/Tauri wiring |
| `review.editProposal` | stdio apply/deny fixture and VS Code ports/capability tests pass; trusted-workspace end-to-end smoke remains |
| Usage, MCP, skills | CLI advertises the live RPCs; stdio usage serialization, MCP lifecycle, and skill install/list tests pass; a credentialed provider run is still needed for the live-meter gate |
| Multi-root | Preferred-root QuickPick, host restart, persistence, relative-path attachment, and diagnostics coverage are implemented and tested |
| npm / Marketplace | Publish workflows, package verification and Marketplace multi-target pre-release automation are ready; registry credentials are not configured |

## 1. Program waves (order)

```text
R0  Hygiene            close doc mirrors, keep typecheck green, no export dupes
R1  Wave 5a            VS Code webview: re-export pure package helpers (drop shared imports in webview)
R2  Wave 4 cont.       app: extract next AiSidePanel composites into agent-ui
R3  Wave 5b            VS Code: mount shared chat column + shrink AltaiApp orchestration
R4  Wave 1             host: Apply/Deny edit proposals on stdio + capability
R5  Wave 2             host: usage meters + MCP/skills RPCs + capability-gated UI
R6  Wave 3             multi-root project target honesty
R7  Wave 6             shared markdown renderer polish
R8  Wave 7 / Wave 0    npm publish, pins, Marketplace (needs org secrets)
```

Waves R4–R6 are **host-first** (`altai-app`). R1–R3 can proceed without them but full
product green needs host waves.

### Delivered since the original baseline

- **R1:** `webviewState`, recovery/deep-link helpers, and composer draft
  persistence are consumed from `@altai/agent-ui`; the Webview draft controller
  is now a thin re-export.
- **R2:** panel width storage, adaptive chrome layout, `AiSidePanelFrame`,
  `AiPanelTopbar`, `AiChatMainColumn`, and the presentational composer tree are
  shared and consumed by Desktop. The remaining work is store/Tauri/resizable
  composition, not another copy of those primitives.
- **R3:** VS Code mounts the shared panel/chat frames and now uses shared
  surface tabs. `AltaiApp` has not yet been deleted because it remains the
  host RPC/state adapter.
- **R4:** CLI unit and stdio fixture tests cover proposal apply/deny and reject
  workspace-path escape; the host advertises the capability only when methods
  are available.
- **R5:** `usage` run events preserve token totals at the CLI stdio boundary;
  MCP lifecycle and skills list/install RPCs are capability-gated and covered
  by native tests. The only remaining gate is a credentialed live provider run
  that reports non-zero usage in the Webview.
- **R6:** the VS Code project chip selects an open workspace root through a
  QuickPick, persists it, restarts the native host against that root, and keeps
  attached paths and diagnostics scoped honestly.
- **R7:** safe shared GFM rendering is mounted in both hosts.
- **R8:** npm workflow packages in dependency order with auth preflight;
  Marketplace release downloads all target artifacts and invokes `vsce` only
  for an explicit opt-in dispatch. Both remain blocked on organization secrets.

**Rules (unchanged):**

1. One PR → one acceptance gate.
2. Capability before control (no enabled placeholders).
3. Never copy Desktop JSX/CSS into `altai-vscode`.
4. Extension Host must not import agent-ui React graph (keep pure EH mirrors).
5. Desktop stays green after every extract.

---

## R0 — Hygiene (ongoing)

| Step | Gate | Repo |
|---|---|---|
| R0.1 Merge remaining pure-mirror docs | CI green | altai-vscode |
| R0.2 No duplicate public exports from `agent-ui` | `tsc` on vscode against package | both |
| R0.3 Keep `file:` sibling for local dev; document pin | Compatible | both |

---

## R1 — VS Code Webview pure re-export (Wave 5a)

**Goal:** Webview code imports pure helpers from `@altai/agent-ui`; Extension Host keeps
local mirrors under `src/shared/`.

| Step | Files | Gate |
|---|---|---|
| R1.1 | Webview re-export + AltaiApp: `webviewState`, `hostRecovery`, `composerDraftPersist` | unit + typecheck |
| R1.2 | Webview re-export deep links / trust / recovery actions already on package | typecheck |
| R1.3 | Prefer webview `*Chrome.ts` only as thin `export { … } from "@altai/agent-ui"` | lint inventory |

**Out of scope:** deleting `AltaiApp` orchestration.

---

## R2 — Continue shared UI extract (Wave 4)

**Goal:** Desktop `AiSidePanel` becomes thin host wiring; package owns panel tree.

Suggested extract order (each = 1 PR):

| Step | Extract | Gate |
|---|---|---|
| R2.1 | Panel width read/persist helpers (localStorage keys/bounds) | unit tests |
| R2.2 | History + inspector chrome layout shell | Desktop smoke |
| R2.3 | `AiChat` transcript host adapter boundary (ports only) | Desktop tests green |
| R2.4 | `AiInputBar` composition using package composer | Desktop smoke |
| R2.5 | Work / Inbox / Settings leftovers into package pages | package + Desktop |
| R2.6 | Desktop deletes dual panel sources for extracted surfaces | no second tree |

**Acceptance (Wave 4):** Desktop imports panel from package path only for side panel.

---

## R3 — VS Code thin mount (Wave 5b)

| Step | Deliverable | Gate |
|---|---|---|
| R3.1 | Mount `AiChatMainColumn` / shared frames with VS Code ports (already partial) | smoke |
| R3.2 | Collapse AltaiApp surface switcher to shared layout helper | unit |
| R3.3 | Delete VS Code composites duplicated by package export | visual parity checklist |
| R3.4 | Capability inventory: no button without `useCapability` | snapshot or matrix update |

**Acceptance:** Chat entry is package UI + ports; no second composer implementation.

---

## R4 — Edit proposals Apply / Deny (Wave 1)

| Step | Owner | Gate |
|---|---|---|
| R4.1 | Confirm stdio RPC create/apply/deny | fixture |
| R4.2 | Advertise `review.editProposal` only when RPCs live | capability test |
| R4.3 | VS Code ports + Enable Apply/Deny | trusted-workspace smoke |

---

## R5 — Usage + MCP + skills (Wave 2)

| Step | Gate |
|---|---|
| Usage events on stdio → Webview run meter | non-zero tokens on live run |
| MCP list/configure RPC + capability | list ≥1 fixture server |
| Skills list/install + capability | install fixture skill; untrusted blocked |

---

## R6 — Multi-project (Wave 3 option A first)

| Step | Gate |
|---|---|
| Preferred root already pure (A6.115) | keep host root sync |
| Multi-root QuickPick = agent root | agent paths relative to pick |
| Chip honesty only (no clone picker v1) | no dead GitHub control |

---

## R7 — Markdown (Wave 6)

Shared renderer in `agent-ui`; both hosts auto-benefit. One gate: sample transcript renders GFM safely (no secret leak).

---

## R8 — Publish + Marketplace (Wave 0 + 7)

Requires org: `NPM_TOKEN`, `VSCE_PAT`, CI budget.

| Step | Gate |
|---|---|
| npm dry-run authenticate | workflow auth |
| Publish `@altai/*` SemVer | pin table in PROTOCOL_COMPATIBILITY |
| vscode uses version pin not only `file:` | install from registry |
| Marketplace pre-release | soak checklist in RELEASE.md |

---

## 2. Dependency graph

```text
R0 ─────────────────────────────┐
R1 (vscode pure reexport) ──────┤
R2 (app AiSidePanel extract) ───┼─► R3 (vscode full thin mount)
R4 Apply/Deny host ─────────────┤
R5 usage/MCP/skills host ───────┤
R6 multi-root ──────────────────┘
              │
              ▼
         R7 markdown
              │
              ▼
         R8 npm + Marketplace
```

---

## 3. What we will not do

- Build a second chat UI in VS Code.
- Enable review/MCP/skills buttons while capability is deferred.
- Import `@altai/agent-ui` from Extension Host (unless a non-React pure subpath exists).
- Force-merge failed typecheck (export collisions).

---

## 4. Immediate execution (current gates)

The original R1–R3 pure-chrome and frame work is delivered. The residual
Desktop Zustand/Tauri and VS Code RPC orchestration is intentional host
ownership, rather than a second presentational panel tree. Do not create a
new extraction PR unless it removes a demonstrable duplicate UI component.

1. **R4:** run the proposal Apply/Deny path in a trusted VS Code workspace
   against the installed native host.
2. **R5:** run a credentialed provider request and verify a non-zero usage
   event reaches the Webview meter; exercise one MCP configuration and one
   fixture skill install in that same trusted-host session.
3. **R8 credentials:** configure repository/environment `NPM_TOKEN`, VS Code
   `VSCE_PAT`, and the explicit `ALTAI_PUBLISH_MARKETPLACE=true` variable.
4. **R8 publication:** dispatch the package publish workflow, replace the
   VS Code `file:` package references with the exact published versions, run
   registry install + VSIX verification, then dispatch the Marketplace
   pre-release workflow and complete the soak checklist.
