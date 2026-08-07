# Desktop Side Chat — Birebir Parity Plan

Status: **authoritative program** for VS Code chat ↔ ALTAI Desktop side chat  
Aligned with ENGINEERING_PLAN §3.1 / Phase 3–6, TASK-007–008, V4–V6  
Last updated: 2026-08-07 · chrome density landed in **vscode 0.1.2** (still not `AiSidePanel` cutover)

## 1. Goal (what “birebir” means)

VS Code plugin chat surface must render the **same React tree and same
product behaviors** as Desktop’s side chat:

| Must match | Notes |
|---|---|
| Layout chrome | History (Desktop model), workspace topbar actions, tabs, inspector |
| Composer | `AiInputBar` feature set: model, permission, attach, @/slash/snippets, compact, stop/send, connectors |
| Transcript | `AiChatView` stream, tools, approvals, clarifications, plan/todos, edit review |
| Settings | Full AI-settings entry (not a thin VS Code Settings hub only) |
| Run inspector | Activity / agents / MCP / changes / approvals / todos / snapshots / research |
| Operations handoff | Work / Inbox / Runs deep-links like Desktop |

**Not** “make VS Code shell bits look a bit closer.”  
**Yes** “one `@altai/agent-ui` panel; VS Code only supplies HostPorts + IDE adapters.”

### Explicit non-goals (still product, not Desktop clone of the whole app)

- Tauri window controls, multi-window Studio, macOS titlebar.
- Desktop-only global app shell outside side chat.
- Pure `vscode.dev` (no native host).
- Re-adding VS Code-only hacks (folder chip under composer, extension version footer, left-rail history) if Desktop model differs; density maps to Activity Bar.

## 2. Why it is not identical today

```text
Desktop (source of truth)          VS Code (current)
─────────────────────────          ─────────────────
AiSidePanel                         AltaiApp + AgentUiShell (composite)
  + AiChatView (store-driven)         + ChatMessageList (host-assembled)
  + AiInputBar (full)                 + ComposerShell + many *Chrome.tsx
  + ChatHistoryPanel (store)          + History *menu* only
  + RunInspector (full tabs)          + partial inspector chrome
  + openSettingsWindow                + ChatSettingsHub (thin)
  + Zustand stores / native           + HostPorts + capability gates
  + TauriHostPorts (richer)           + stdio altai-cli (subset / lag)
```

So visual “benzemeye başladı” is **shared tokens + partial agent-ui pieces**.  
Missing Settings controls, inspector tabs, composer affordances, etc. live mostly
still in Desktop modules **or** behind incomplete HostPorts / capabilities.

## 3. End-state architecture

```text
                 packages/agent-ui
        AiSidePanel  AiChatView  AiInputBar  Inspectors
        session/run controllers (ports-first, no Tauri)
                         │
              HostPortsProvider + Capabilities
                    /                \
           TauriHostPorts         VsCodeHostPorts
           (altai-app)            (altai-vscode)
                    \                /
                 altai-agent-service / IsanAgent
                 (Desktop IPC or stdio altai-cli)
```

VS Code webview after cutover:

```tsx
<HostPortsProvider ports={vsCodePorts} capabilities={caps}>
  <AiSidePanel variant="sidebar" density="auto" {...hostAdapters} />
</HostPortsProvider>
```

Delete `AgentUiShell` chat assembly and most `Chat*Chrome.tsx` once ports cover behavior.

## 4. Gap matrix (Desktop side chat → target)

Legend: **G** green in Desktop product · **partial** VS Code has a slice · **missing** · **N/A** intentionally different host

| Surface | Desktop | VS Code now | Path to parity |
|---|---|---|---|
| Brand / tokens (lime, empty home) | G | partial | Shared package CSS + existing tokens |
| Session history | Overlay rail + search/rename/delete | **Clock icon + popover** (`ChatHistoryPanel`) | Extract Desktop history UX fully into package |
| Chat tabs | Full | Partial strip (same row as history) | Same tab strip + session store/ports |
| Shell topbar | 2-row history/tabs + Work/Inbox | **0.1.2: 2-row Desktop density** | Still not `AiSidePanel` tree |
| Settings entry | Gear (workspace) / window | **Settings gear (toggle)** + hub | Shared SettingsContent extract |
| Surface text tabs | None on sidebar | **removed** (0.1.2) | Keep removed |
| Message transcript | AiChatView | Custom list | **Move AiChatView** to agent-ui on ports/events |
| Composer full (`AiInputBar`) | G | Partial chrome | **Move AiInputBar** behind HostPorts |
| Model picker + settings gear | G | Partial | Host models + settings port complete |
| Permission modes + bypass confirm | G | Partial | Parity modes + confirmation port/policy |
| @files / slash / snippets | G | Partial | Shared pickers; workspace.search/read ports |
| Attachments | G | Partial | Port limits already; wire UI from AiInputBar |
| Provider connect | Desktop native prompts | Extension Host password | Keep secret outside Webview; same UI states |
| Plan mode strip / todos | G | Partial | Share PlanModeStrip + todo bridge |
| Approvals / clarifications | G | Partial | Same cards; event stream parity |
| Edit / plan diff review | G | Partial apply/deny | Ports + VS Code diff editor |
| Checkpoints / restore | G | Partial | ports.review.* + UI |
| Run inspector (multi-section) | Full RunInspector | Partial | Extract inspector shell; fill via ports |
| Agents switcher | G | Missing/weak | ports.agents + AgentSwitcher extract |
| MCP inspector | G | Status chrome only | ports.mcp + McpInspector |
| Skills status / install | G | Weak chrome | ports.skills + UI |
| Settings (AI settings surface) | Separate settings window + AI sections | Thin hub (provider/model/perm/mcp/skills) + VS Code settings | **Shared SettingsContent AI sections** on ports |
| Work / Inbox | Operations in app | Topbar icons → Operations surface | Shared ops routes already |
| Workspace target / Studio | Desktop multi-workspace | N/A or palette only | Keep IDE folder model |

### Phase 0 inventory — Desktop sidebar topbar controls

| Control | Desktop | VS Code 0.1.2 | Owner |
|---|---|---|---|
| History (Clock) | Toggle rail/overlay | Icon + popover | vscode host chrome → later package |
| New session | History panel + | Icon + tab strip | ports.sessions.create |
| Chat tabs | ChatTabStrip | ChatTabStrip shared | agent-ui presentational |
| Work | WorkspaceTopbarActions | same component | agent-ui |
| Inbox + badge | same | same | agent-ui + ports.inbox |
| Run inspector | Sparkles | same when available | partial chrome |
| Settings gear | workspace variant only | always (toggle hub) | vscode until SettingsContent extract |
| TodoSummaryChip | on topbar | in message chrome | later extract |
| Close panel | optional | N/A (IDE owns panel) | N/A |
| Studio / window controls | Desktop only | N/A | N/A |
| Chat \| Ops \| Settings tabs | none | **removed** | — |
| Install banner | none | **removed** | — |

### Composer affordances (still composite)

| Control | Desktop `AiInputBar` | VS Code |
|---|---|---|
| Textarea + send/stop | G | G |
| Model dropdown | G | ChatModelPickerChrome |
| Permission switcher | G | ChatPermissionModeChrome |
| Attach menu (file/map/term/diff) | G | G toolbar Code + chips | maps to workspace ports (no file-picker upload yet) |
| @ / slash / snippets | G | Partial pickers | Shared pickers; workspace.search/read ports |
| Compact context | G | ChatComposerCompact in tools | ok |
| Connect / provider | G | Connect banner + Settings | Settings hub |
| Agent switcher | G | **composer agent profiles (0.1.x)** | keep freeze; full ports.agents extract later |
| Send / Stop | icon / stop | **0.1.3 Desktop-style** | freeze chrome; extract AiInputBar next |
| Permission toolbar icon | G | **toolbar-icon 0.1.3** | ok |
| Footer MCP/skills strip | none (inspectors) | **removed 0.1.3** | Settings hub |

### Inspector sections (Desktop RunInspector)

Activity, agents, MCP, changes, approvals, todos, snapshots, research — VS Code has
**partial** `ChatRunInspectorSections` / details chrome only.

## 5. Workstreams (parallelizable)

### W1 — Host protocol completeness (`altai-app` / `altai-cli`)

Bring stdio host capability surface to **Desktop feature parity** for chat:

1. sessions (list/create/rename/archive/delete/messages/truncate) journal solid  
2. runtime (start/stream/steer/queue/cancel/retry/replay/compact)  
3. interactive (approval, clarification, permission modes including bypass confirm)  
4. settings (full AI patch surface Desktop uses — not only model/permission)  
5. models list/select  
6. providers status/connect/clear  
7. review (checkpoints, edit proposals apply/deny)  
8. workspace ports (search, read, open, diff) via VS Code adapter + host  
9. work / inbox / automations already partial  
10. mcp + skills RPCs advertised and implemented  

**Exit gate:** capability document for `altai-cli serve` ⊇ Desktop Tauri host for side-chat controls; no enabled-but-dead buttons in UI.

### W2 — Shared UI extraction (`altai-app` → `@altai/agent-ui`)

Order (each PR reviewable; Desktop always green):

| Slice | Extract | Notes |
|---|---|---|
| A | Presentational leftovers inventory | Diff Desktop imports vs package exports |
| B | History controller (ports or injected session API) | Desktop ChatHistoryPanel → package |
| C | `AiChatView` + event mapping | No Tauri; inject event subscription via HostPorts.runtime |
| D | `AiInputBar` + pickers | File/snippet/slash; no `native` imports |
| E | RunInspector + section bridges | Data only via ports |
| F | AI Settings sections | HostPorts settings; no OS window dependency |
| G | `AiSidePanel` shell | Layout + surface toggles; density prop for VS Code |
| H | Desktop switches to package import only | Delete in-app duplicates |

**Exit gate:** Desktop screenshot baselines within threshold; unit tests for extracted trees.

### W3 — VS Code thin host (`altai-vscode`)

| Slice | Work |
|---|---|
| 1 | Freeze new composite chrome (`Chat*Chrome` no new features) |
| 2 | Complete `createVsCodeHostPorts` for every capability UI needs |
| 3 | Map Extension Host workspace.adapter methods (open, diff, search) |
| 4 | Settings: open shared AI settings *or* dual-route Settings tab hosting shared tree |
| 5 | **Cutover:** mount `<AiSidePanel />`, delete `AgentUiShell` path |
| 6 | Density: Activity Bar = sidebar compact; Secondary Sidebar wide = desktop-like |
| 7 | Remove temporary banners | **done (0.1.2)**; final purge after AiSidePanel cutover |
| 8 | Integration tests: trust → init → startRun → stream → approval → settings update |

**Exit gate:** no second chat implementation symbols in arch guard; FEATURE_MATRIX chat row green.

### W4 — Visual + a11y gates

- Shared tokens (already lime primary); light/dark/high-contrast  
- Screenshot fixtures Desktop vs VS Code @ 320 / 480 / 720 width  
- Keyboard (history, inspector, composer) + reduced-motion  

## 6. Delivery phases (sequenced)

### Phase 0 — Freeze & inventory (1–3 days)

- [x] VS Code install path unblocked (0.1.1 / load correct extension)  
- [x] Desktop sidebar topbar control inventory (table §4)  
- [x] VS Code shell density slice 0.1.2 (topbar / history / settings gear / no text tabs)  
- [ ] Assign remaining composer/inspector rows → first extract PRs (AiInputBar next)

### Phase 1 — Protocol parity for side chat (1–2 weeks, `altai-cli` + Desktop ports)

- Complete RPCs + capabilities for settings depth, MCP/skills, review, agents  
- Golden event/journal tests Desktop Tauri vs stdio  

### Phase 2 — Extract transcript + composer (2–3 weeks, `altai-app`)

- Ports-first `AiChatView` + `AiInputBar` in agent-ui  
- Desktop consumes package; stores refactor or adapter layer  

### Phase 3 — Extract inspector + settings + AiSidePanel (2–3 weeks)

- Full shell export; Desktop production path is package  
- Settings sections ported  

### Phase 4 — VS Code cutover (1–2 weeks)

- Single mount; purge composite shell  
- Capability-gated controls only when host ready  

### Phase 5 — Hardening & release channel (1–2 weeks)

- Visual regression, remote smoke, VSIX matrix  

**Rough total:** ~7–12 weeks one engineer (matches ENGINEERING_PLAN AI extract + VS Code core), shorter if A (app) + V (vscode) staffed in parallel after protocol lock.

## 7. Acceptance checklist (“birebir done”)

User-visible:

1. Open ALTAI in VS Code: same control clusters as Desktop side chat (allowing density collapse).  
2. Settings: same AI options as Desktop AI settings (host-persisted).  
3. Same composer capability set when host advertises them.  
4. History model matches Desktop (search, rename, delete, open).  
5. Run inspector sections populated when host has data.  
6. No raw RPC codes; no dead buttons.  
7. Code: one `AiSidePanel` entry; arch guard forbids second message list / composer.

## 8. Immediate next implementation slices

1. ~~Inventory + VS Code shell density~~ (**0.1.2**)
2. ~~Composer layout density~~ (**0.1.3**)
3. ~~Shared `AiComposer` in agent-ui + VS Code mount~~ (**0.1.4**); Desktop `AiInputBar` still host-logic shell (same visual slots).
4. ~~Settings depth: compaction via `config/update` + Settings hub~~ (**0.1.4** / `altai-cli`)
5. **Freeze rule:** no new `Chat*Chrome` composer features — expand host ports or package only.
6. ~~Shared `AiComposer` re-export + Desktop mount path~~ (**altai-app** main).
7. ~~`AiSidePanelFrame` + layout breakpoints + composer availability~~ (agent-ui A6.20–23; VS Code mounts frame).
8. **Next extract:** ports-first `useComposer` + Desktop picker adapters → package; then full `AiSidePanel` body cutover.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Extract with Tauri still inside UI | CI ban `tauri` / `@tauri` imports under `packages/agent-ui` |
| VS Code keeps adding chrome “meanwhile” | Freeze rule: chat UI only in package after Phase 0 |
| stdio lag → empty Settings | Gate controls; ship host work before cutover |
| Activity Bar width | Density modes + overlays already proven on plugin |

## 10. Decision log

| Decision | Choice |
|---|---|
| One UI tree | Yes — package owner in altai-app |
| Secrets | Extension Host / Rust only |
| Folder chip under composer | Removed intentionally for VS Code; multi-root via palette/host if needed |
| Exact pixel Desktop wide rail | Not required at 300px; overlay/history menu allowed when density=sidebar |

---

When this program completes, “plugins looks like ALTAI” is no longer composite
chrome: it **is** the Desktop side chat host-adapted to VS Code.
