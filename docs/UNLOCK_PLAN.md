# Unlock plan — remaining production blockers

Status: planning  
Date: 2026-08-06  
Audience: maintainers shipping Desktop + VS Code from one UI and one host  

This plan turns the “cannot finish from `altai-vscode` alone” list into a
**sequenced, multi-repo program** with owners, deliverables, acceptance gates,
and explicit dependency order. It does not allow placeholder buttons, UI forks,
or secrets in the Webview.

Related:

- [ENGINEERING_PLAN.md](ENGINEERING_PLAN.md) (architecture rules)
- [ALTAI_ARCHITECTURE_OVERVIEW.md](ALTAI_ARCHITECTURE_OVERVIEW.md) (component map)
- [PROTOCOL_COMPATIBILITY.md](PROTOCOL_COMPATIBILITY.md) (version pins)
- [RELEASE.md](RELEASE.md) (channels / checklist)
- [FEATURE_MATRIX.md](FEATURE_MATRIX.md) (current G/Y/R)

---

## 1. What “blocked” means (plain language)

| Symptom in VS Code | Real missing piece | Not fixed by… |
|---|---|---|
| Apply / Deny on edits | Rust host must **write** (or reject) file changes with a stable proposal id | Webview-only buttons |
| Desktop-identical Chat | Full `AiSidePanel` tree must live in **`@altai/agent-ui`** and Desktop must use it | Copying Desktop JSX into vscode |
| Skills install UI | Host RPC: list / install / enable skills | Fake settings toggles |
| Real token numbers | Host already emits **usage** events; hosts must map + UI must accumulate | Hard-coded “live / n/a” forever |
| Multi-project switch | Product model: project/workspace target (Desktop has it; stdio host does not export it fully) | Chip that only reveals Explorer |
| Full markdown | Shared renderer in `@altai/agent-ui` (or agreed host message segments) | One-off VS Code markdown parser |
| npm `@altai/*` packages | Org **NPM_TOKEN** + publish job in `altai-app` | Keeping eternal `file:` siblings |
| Marketplace + signed host | **VSCE_PAT**, release soak, optional signing beyond sha256 | Local VSIX only |
| CI queued / flaky Actions | Org runners, budget, status API health | Admin-merging forever |

**Rule:** each wave ends with **capability advertised only when the backend
exists**, then VS Code enables the control. Never enable first.

---

## 2. End state (definition of unlocked)

1. Desktop and VS Code render the **same** `@altai/agent-ui` Chat/Operations/Settings tree from **published** (or pin-tracked) packages.
2. Every PRODUCT control below works end-to-end on Desktop **and** `altai-cli serve --stdio` with the same protocol major.
3. VS Code is only: trust, spawn host, VS Code editor adapters, Webview bridge — **no second chat**.
4. Internal → alpha → beta → stable follows [RELEASE.md](RELEASE.md); FEATURE_MATRIX yellows become green where in scope.

---

## 3. Principles (non-negotiable)

1. **Ownership**
   - Product UI, protocol, Rust host, IsanAgent integration → **`altai-app`**
   - VS Code adapter + packaging pin → **`altai-vscode`**
   - Tokens, Marketplace, Actions runners → **org / release engineering**
2. **One PR / one acceptance gate** per wave step (same as current cadence).
3. **Capabilities before controls** (ENGINEERING_PLAN §3.3).
4. **Desktop must stay green** after every extract or protocol change.
5. **Stdio parity:** if Desktop can do it, `serve --stdio` either supports it or
   explicitly advertisements `deferred` — never silent “almost”.

---

## 4. Program structure (seven waves)

```text
Wave 0  Org foundations (tokens, CI health)
   │
Wave 1  Protocol + host: edit proposals (Apply/Deny)
   │
Wave 2  Protocol + host: usage meters, MCP/skills surfaces
   │
Wave 3  Protocol + host: project targets (multi-project)
   │
Wave 4  Shared UI extract: AiSidePanel → @altai/agent-ui (pixel path)
   │
Wave 5  VS Code thin host: wire capabilities + drop dual chrome
   │
Wave 6  Rich content (markdown) inside shared UI
   │
Wave 7  Publish packages + Marketplace + release soak
```

Waves 0 can start **in parallel** with 1.  
Waves 1–3 are host-first.  
Wave 4 is mostly `altai-app`.  
Wave 5 is `altai-vscode` (short once capabilities + UI exist).  
Wave 6 can partially run after 4 is stable.  
Wave 7 needs 4+5 green + Wave 0 secrets.

---

## Wave 0 — Org foundations (unblocks npm, Marketplace, CI)

**Owner:** release engineering / org admin  
**Repos:** `altai-app`, `altai-vscode`, GitHub org, npmjs / VS Marketplace

### 0.1 Secrets and auth

| Secret | Where | Used for |
|---|---|---|
| `NPM_TOKEN` | `altai-app` repo + org | Publish `@altai/host-contract`, `@altai/agent-ui`, protocol packages |
| `VSCE_PAT` | `altai-vscode` repo | `vsce publish --pre-release` / stable |
| GitHub Actions billing / concurrency | org | Unblock long `queued` jobs and failed action downloads |

**Acceptance:**

- [ ] A dry-run publish workflow authenticates to npm (no public tag required).
- [ ] A private PAT can list `vsce` publishers for `altaidevorg`.
- [ ] Sample PR CI leaves `queued` within budget (e.g. &lt; 10 min start).

### 0.2 CI reliability

- Pin official `actions/*` to SHAs; retry policy on transient GitHub 502.
- Separate **required** checks: `quality` + `verify` only; smoke optional until host matrix is green.
- Document “local verify is source of truth when GitHub Actions API is down” for maintainers — temporary; not a substitute for required checks after 0.1.

**Acceptance:** three consecutive PRs to `altai-vscode` have non-flaky `quality` green without admin force-merge.

---

## Wave 1 — Edit proposals: Apply / Deny (unlocks product review)

**Owner:** `altai-app` (Rust + protocol + Desktop bridge)  
**Consumer later:** `altai-vscode` Chat change-review panel  

### Problem today

VS Code can **open** and **dismiss** edit diffs. Apply is withheld because
capability `review.editProposal` is deferred and `applyEditProposal` /
`denyEditProposal` are not wired to a durable host operation.

### 1.1 Protocol / host-contract (`packages/host-contract`)

Deliver:

- Stable types, e.g. `EditProposal { id, chatId, runId?, path, kind, originalHash?, proposedContent or ref }`.
- Methods already sketched: `review.applyEditProposal(id)`, `review.denyEditProposal(id)`.
- Capability `review.editProposal: available` **only** when both RPCs exist.

JSON-RPC (illustrative names — match final protocol table):

| Method | Direction | Notes |
|---|---|---|
| `review/proposals/list` | client → host | Optional; or proposals stream via `run/event` |
| `review/proposals/apply` | client → host | Idempotent by proposal id |
| `review/proposals/deny` | client → host | Idempotent |

**Acceptance:** contract tests green; capability matrix updated; no desktop-only types.

### 1.2 Rust service (`altai-agent-service` + `altai-cli serve`)

Deliver:

- Create proposal records from agent edit tools / plan queue (same source Desktop uses).
- Apply: write workspace file under policy + permission mode; record checkpoint/snapshot side-effect; emit lifecycle/journal event.
- Deny: drop proposal; optional journal marker.
- Reject duplicate apply/deny with stable error codes (`already_applied`, `unknown_proposal`).
- Permission modes: plan / ask / allow respect existing policy (no bypass without confirmation path).

**Acceptance:**

- [ ] Stdio integration fixture: start run → proposal event → apply → file on disk matches → deny path covered.
- [ ] Desktop uses the **same** service path (not a second Tauri write path).
- [ ] `capabilities` document advertises `review.editProposal` only after methods respond.

### 1.3 Desktop adapter

- Map UI Apply/Deny to ReviewPort (not direct FS).
- Screenshots / regression on review centre.

### 1.4 VS Code wire-up (small; after 1.1–1.3)

Repo: `altai-vscode`

- Implement `applyEditProposal` / `denyEditProposal` in `createVsCodeHostPorts`.
- Advertise capability when native methods present.
- Mount PlanDiff / existing panel with **Apply/Deny** only when capability is on.
- Remove “requires future capability” copy; keep dismiss as local UX.

**Acceptance:** one trusted-workspace smoke: agent proposes edit → Apply → file open in VS Code reflects content; reload does not re-apply.

**Unlocks:** product review workflow (TASK-011 remainder).

---

## Wave 2 — Usage meters + MCP/skills host surface

**Owner:** `altai-app` host + event bridge; thin VS Code follow-up  

### 2.1 Token / usage meters

**Fact:** journal / serve already carries `usage` payloads (`prompt_tokens`,
`completion_tokens`, `total_tokens`, cache fields). Gap is **mapping + UI**.

Deliver:

1. **Stdio:** ensure every IsanAgent usage event is forwarded as `run/event` with type `usage` (no drop under serve).
2. **host-contract:** ensure `AgentEvent` type includes usage; document fields.
3. **agent-ui / Desktop:** shared run meter accumulation (mirror Desktop `agentEventBridge` usage case).
4. **VS Code:**  
   - map usage in `mapRunEvent`;  
   - accumulate into Run details (`RunOverviewCard` token label);  
   - never invent totals when events missing.

**Acceptance:** live run shows non-zero total tokens on Desktop and VS Code for the same model call; reload restores last totals if journal replay is used.

### 2.2 MCP surface

Deliver:

- Finalize stdio methods: `mcp/servers/list`, configure, enable, restart (and tools visibility if product needs it).
- Advertise `mcp.list` / `mcp.configure` consistently.
- Shared Settings or inspector for MCP (prefer extract into agent-ui Settings later).
- VS Code: keep capability-gated `ChatMcpStatusChrome`; add Settings page when shared Settings exists (Wave 4/5).

**Acceptance:** list ≥1 server on a fixture host; restart does not leak secrets into logs.

### 2.3 Skills surface

Deliver:

- Stdio: `skills/list` (and install / enable if Desktop has them).
- Capability `skills.list` / `skills.install`.
- Ports: implement `listSkills`, `installSkill`, `setSkillEnabled` on both Tauri and stdio adapters.
- UI: skill chips / install only when capabilities available (shared Settings preferred).

**Acceptance:** list skills on Desktop and VS Code; install path tested with a safe fixture skill; untrusted workspace cannot install.

**Unlocks:** real tokens; MCP/skills product status (TASK-012 portions).

---

## Wave 3 — Multi-project / workspace target model

**Owner:** product + `altai-app` host; VS Code uses **single open folder** as default  

### Product choices (make these first)

Decide in writing:

1. **A — VS Code first:** project target **is** the trusted workspace folder set (no GitHub clone picker in v1).  
2. **B — Desktop parity:** host stores “ALTAI project” (local path or GitHub) independent of editor folders.

Recommendation for first unlock: **A**, then optional **B** as later epic.

### 3.1 Contracts

- Extend `WorkspaceInfo` or add `ProjectTarget { kind: local|github, name, path?, remote? }`.
- RPC optional: `workspace/setTarget` only if B ships; otherwise read-only from VS Code `workspaceFolders`.

### 3.2 VS Code behavior (A)

- Chip stays informational + reveal (already shipped).
- Multi-root: target = **first folder** or user-picked folder via QuickPick (Extension Host only); host root list kept in sync on folder change.
- Events: `workspace.folders` changed → re-`initialize` or notify host of roots.

### 3.3 Desktop behavior (B, later)

- Keep existing project UI; implement via shared ports so VS Code can later attach remote projects only when remote FS + host support exist.

**Acceptance (A):** multi-root workspace: user picks target root; agent runs relative to that root; change folders refreshes chip without dead controls.

**Unlocks:** honest multi-folder UX; foundation for GitHub projects if B is approved.

---

## Wave 4 — Shared UI extract (Full AiChat pixel path)

**Owner:** `altai-app` (TASK-007)  
**This is the longest critical path for “feels like Desktop”.**

### 4.1 Package cut

Move / finish ownership inside packages:

| Package | Content |
|---|---|
| `@altai/host-contract` | ports, capabilities, types (already) |
| `@altai/agent-ui` | full Ai side panel tree: chat, composer, history, Work, Inbox, settings slices, inspector, review centre |
| (optional) `@altai/agent-protocol` | framing if not already published |

Rules from ENGINEERING_PLAN:

- Desktop imports **package source**, no leftover dual tree.
- No `vscode` / `@tauri-apps` imports inside `agent-ui`.
- Stores either: (a) live entirely behind ports, or (b) thin package stores fed only by host adapters.

### 4.2 Extraction order (suggested)

1. Leaves already partially shared (composer shells, banners, review rows) — **done-ish**.
2. **Transcript + event store** behind adapter interfaces.
3. **AiInputBar** (attachments, slash, voice optional).
4. **AiChat / side panel chrome** (tabs, history, empty states).
5. **Work / Inbox / Settings** panels already partly on ports — complete settings MCP/skills pages.
6. **Visual regression** Desktop: light/dark/HC + key chat states.

### 4.3 Acceptance

- [ ] Desktop build uses only package paths for panel.
- [ ] Desktop test + manual smoke green.
- [ ] Package version bumps with changelog.
- [ ] No second chat component remains in Desktop app sources for side panel.

**Unlocks:** true pixel-parity path for VS Code (TASK-008 becomes “thin host mount”, not reimplement).

---

## Wave 5 — VS Code thin host mount (TASK-008 cleanup)

**Owner:** `altai-vscode`  
**Depends on:** Waves 1–4 for full product; partial mounts can land earlier.

### 5.1 Consume packages

- Replace/keep `file:` links initially; switch to **npm versions** after Wave 7.1.
- Delete VS Code-only chat widgets that **duplicate** shared surfaces once package exports a full shell (progressive: do not leave two composers).

### 5.2 Host adapter completeness

| Port area | Must be parity with Desktop |
|---|---|
| runtime | start/steer/cancel/retry/queue/compact/replay/approvals |
| sessions | full list/create/rename/archive/delete/messages/truncate |
| workspace | info, files, selection, search, open, diff, git, terminal, external |
| review | checkpoints **+** edit proposals |
| settings | providers, models, permission, MCP, skills |
| work / inbox | existing Operations |
| events | including usage |

### 5.3 Capability matrix alignment

- `createVsCodeHostPorts` advertises only what native supports.
- Visual inventory: no button without capability test.
- Optional snapshot test: capabilities JSON fixture.

### 5.4 Theme + a11y

- Shared tokens already map to VS Code CSS variables — re-verify after full shell mount.
- Light/dark/high-contrast smoke checklist.

**Acceptance:** side panel entry points to shared `AgentUiShell` / equivalent package root; chrome-only stubs gone for Chat; Operations remain capability-gated.

---

## Wave 6 — Rich markdown (shared, optional polish)

**Owner:** `@altai/agent-ui` (prefer), both hosts auto-benefit  

### Scope

- Assistant/user message bodies: headings, lists, tables, italics, safe links, code fences (sanitized).
- Keep existing path/`file://`/`openExternal` segmentation **or** fold into one renderer with host callbacks for open.
- XSS: render in sandbox / sanitize; **no** raw HTML execute.

### Non-goals

- Full mail client / arbitrary remote image fetch without CSP plan.

**Acceptance:** shared snapshot tests; Desktop + VS Code screenshot of sample messages match within theme difference only.

---

## Wave 7 — Publish packages + Marketplace + signed hosts

**Owner:** release eng; depends Wave 0 + packages stable  

### 7.1 npm publish (`altai-app`)

1. Semver: `host-contract` first, then `agent-ui` depending on it.
2. CI job `publish-packages` on tags `packages-v*`.
3. Document consumption in PROTOCOL_COMPATIBILITY.
4. `altai-vscode` PR: `file:` → `^x.y.z` + lockfile.

**Acceptance:** clean machine `npm i` + `npm run verify` without sibling checkout.

### 7.2 Real multi-OS host binaries

- Already sketched in `release.yml` / PIN: build `altai-cli --release` per target; stage sha256.
- Optional: detached signatures beyond sha256 (Y status).

### 7.3 Marketplace

| Channel | Action |
|---|---|
| pre-release / alpha | `vsce publish --pre-release` with `VSCE_PAT` |
| stable | drop `"preview": true` only after matrix green |

Follow [RELEASE.md](RELEASE.md) checklists (trust, remote smoke, secrets).

### 7.4 CI policy post-unlock

- Required checks without admin merge exception.
- Nightly remote SSH job (optional runner labels).

**Unlocks:** yellow FEATURE_MATRIX cells for org publish; external install without local sibling.

---

## 5. Suggested calendar (orientation only)

Assuming one engineer on host/UI and 0.25 FTE org:

| Wave | Rough order | Relative effort |
|---|---|---|
| 0 Org + CI | week 0 (parallel) | small / external |
| 1 Edit proposals | weeks 1–2 | medium–large |
| 2 Usage + MCP/skills host | weeks 2–3 | medium |
| 3 Project target decision + multi-root | week 3 | small–medium |
| 4 Full UI extract | weeks 4–7 | **large** |
| 5 VS Code thin mount | weeks 7–8 | medium |
| 6 Rich markdown | week 8–9 | small–medium |
| 7 Publish + Marketplace | week 9+ | org + release |

Two engineers (host + UI): compress Wave 4 with Wave 1–2 parallelization after contracts freeze.

---

## 6. Per-wave PR checklist (use every time)

```text
[ ] Repo ownership correct (altai-app vs altai-vscode vs org)
[ ] Host RPC or package first; UI second
[ ] Capability advertised only when RPC green
[ ] Desktop smoke still green (if altai-app)
[ ] npm run verify / cargo test relevant
[ ] CHANGELOG + PROTOCOL_COMPATIBILITY if version pin moves
[ ] VS Code pin update only after host pin staged
[ ] No secrets in Webview / logs
[ ] One acceptance gate in PR body
```

---

## 7. Tracking matrix (update as waves complete)

| Unblock item | Wave | Primary repo | Status |
|---|---|---|---|
| CI Actions reliability | 0 | org + both | open |
| NPM_TOKEN / package publish | 0 + 7 | org + altai-app | open |
| VSCE_PAT / Marketplace | 0 + 7 | org + altai-vscode | open |
| edit Apply/Deny | 1 | altai-app → vscode | **in progress** — `review/proposals/*` on stdio host; VS Code Apply/Deny when capability present |
| Real token meters | 2 | altai-app → vscode | **in progress** — vscode accumulates `usage` events into Run details |
| MCP full product surface | 2 + 4/5 | altai-app → vscode | open (list cap partial) |
| Skills install UI | 2 + 4/5 | altai-app → vscode | open |
| Multi-project / multi-root target | 3 | product + both | open (reveal-only today) |
| Full AiChat pixel parity | 4 + 5 | altai-app → vscode | open |
| Rich markdown | 6 | agent-ui | open (light segments today) |
| Signed host beyond sha256 | 7 | org | open (optional) |

---

## 8. Immediate next actions (start here)

1. **Land Wave 1 PRs:** `altai-app` `review/proposals/*` + protocol allow-list; then
   `altai-vscode` Apply/Deny wire-up against a host binary that advertises the
   methods (rebuild `altai-cli` from the Wave 1 branch).
2. **Org:** create `NPM_TOKEN` + `VSCE_PAT`; fix Actions concurrency (Wave 0).  
3. **altai-app:** Desktop PlanDiffReview → `ReviewPort.applyEditProposal` (stop
   writing files only from the frontend plan store).  
4. **altai-app:** inventory AiSidePanel import graph for Wave 4 extract.  
5. **altai-vscode:** no large chrome PRs until Wave 2 usage/MCP/skills caps
   land, except small host mapper prep.

---

## 9. Explicit non-goals (still out of v1)

- `vscode.dev` pure web (no native host) — FEATURE_MATRIX **R**
- Second chat frontend in VS Code
- Bypass permission mode without product policy
- Shipping Apply before host apply is real

---

## 10. Success story (one paragraph)

When this plan completes, installing the Marketplace extension starts a pinned
`altai-cli serve` host, loads shared `@altai/agent-ui`, and runs the same
Chat/Work/Inbox/Settings experience as Desktop: edits can be applied with
durable proposals, tokens are real, MCP and skills are manageable, multi-root
targets are honest, packages come from npm, and CI + release channels no longer
require maintainer admin merges or sibling checkouts.
