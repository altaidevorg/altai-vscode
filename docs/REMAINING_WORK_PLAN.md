# Remaining work plan — pure chrome through A6.207

Status: active  
Owners: `altai-app` (product UI, protocol, Rust host), `altai-vscode` (thin adapter)  
Related: [UNLOCK_PLAN.md](UNLOCK_PLAN.md), [ENGINEERING_PLAN.md](ENGINEERING_PLAN.md), [FEATURE_MATRIX.md](FEATURE_MATRIX.md)

Pure dual-chrome extraction continues (**A6.140–A6.207**: inbox view, plan queue, store mutation helpers, automation list chrome). This document sequences **everything still required**
for production unlock, with one acceptance gate per PR.

## 0. Current baseline (2026-08-10+)

| Track | State |
|---|---|
| Pure chrome `agent-ui` libs | ~A6.140–A6.207 on `altai-app` main (through env blocks, slash prompts, run meta, compaction toast) |
| VS Code host mirrors | Through A6.149 redact #320; plan #321; native method #317; skills install #318; placeholders/proposal #319; keyboard #315; draft R3 #314 |
| Dual shell | VS Code still owns large `AltaiApp.tsx` orchestration + composite chrome wrappers |
| Desktop | `AiSidePanel` Escape + ops/width helpers wired; still owns Resizable + stores |
| `review.editProposal` | stdio/VS Code capability + unit path present; trusted E2E smoke still due |
| npm / Marketplace | Still `file:` sibling + local VSIX |

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

## 4. Immediate execution (this session onward)

1. **R1.1** — Webview re-export A6.130–132 (+ draft persist) and switch `AltaiApp` imports.  
2. **R2.1** — Package pure panel width helpers (A6.133).  
3. Repeat until R1 inventory empty; then R2.2+.  
4. Host waves R4+ in `altai-app` when UI cutover is not blocked by pure work.
