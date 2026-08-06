# ALTAI VS Code Extension — Engineering Plan

- Status: Ready for implementation
- Primary repository: `altaidevorg/altai-vscode`
- Upstream repositories: `altaidevorg/altai-app`, `altaidevorg/isanagent`
- License: Apache-2.0

- [FEATURE_MATRIX.md](FEATURE_MATRIX.md) — channel status snapshot
- [UNLOCK_PLAN.md](UNLOCK_PLAN.md) — multi-repo plan to unlock Apply/Deny, full
  shared UI extract, MCP/skills, usage meters, npm/Marketplace, and CI foundations

## 1. Objective

Build a production VS Code extension that renders the same ALTAI chat UI and
uses the same ALTAI/IsanAgent runtime as ALTAI Desktop.

The extension is not a visual imitation and not a separate product frontend.
It is another host for shared ALTAI packages:

- one React component tree for Desktop and VS Code;
- one versioned host protocol;
- one Rust agent service above IsanAgent;
- platform adapters for Tauri and VS Code;
- shared durable session, run, settings, Work, and Inbox data;
- no visible action without an implemented backend capability.

## 2. Success criteria

The project reaches stable release only when all of the following are true:

1. Desktop and VS Code import the same `@altai/agent-ui` package.
2. No duplicate chat JSX or copied ALTAI CSS exists in this repository.
3. Every visible button has a tested command or RPC handler.
4. The same workspace session can be replayed consistently through Tauri and
   the VS Code stdio host.
5. Start, stream, steer, cancel, retry, approval, clarification, compaction,
   and replay work after Webview reload.
6. History, Work, Inbox, Settings, diffs, checkpoints, MCP, and skills use the
   same shared UI surfaces as Desktop.
7. Provider secrets never enter the Webview or extension logs.
8. Untrusted workspaces cannot start the agent host or mutate the workspace.
9. The extension passes light, dark, high-contrast, remote workspace, and
   supported-platform tests.

## 3. Non-negotiable architecture rules

### 3.1 One UI source

`AiSidePanel` and its complete child tree are extracted from `altai-app` into
`@altai/agent-ui`. This includes:

- `AiChatView`;
- `AiInputBar`;
- chat tabs and history;
- Work/Runs/Scheduled;
- Inbox;
- Settings;
- model and permission selectors;
- approval, clarification, plan, and edit-diff cards;
- run inspector;
- context chips, attachments, slash commands, and snippets;
- shared theme tokens and panel CSS.

The extension supplies a host adapter. It must not rebuild these components.

### 3.2 Rust owns privileged operations

The Webview does not receive provider credentials and does not call
IsanAgent, MCP servers, the shell, or arbitrary filesystem APIs directly.

The extension host handles VS Code integration. The Rust host handles the
agent runtime, provider configuration, durable records, tools, MCP, skills,
and secret access.

### 3.3 Capabilities before controls

The host returns a versioned capability document during initialization. A UI
control is enabled only when its capability is available. A production build
must never ship an enabled placeholder action.

### 3.4 No unstable VS Code APIs

Use stable VS Code APIs only. The extension contributes an Activity Bar view.
Users may move that view to the Secondary Side Bar; the extension must not
depend on proposed APIs to force that placement.

### 3.5 Desktop must remain working

Shared-package extraction is complete only when ALTAI Desktop renders the
package and all existing Desktop tests pass. A package is not considered
shared while Desktop still imports an older local copy.

## 4. System architecture

```text
                         @altai/agent-ui
              shared React, stores, events, styles
                               |
                 +-------------+-------------+
                 |                           |
        TauriHostAdapter             VsCodeWebviewAdapter
                 |                           |
          ALTAI Desktop              VS Code Webview
                 |                           |
                 |                    typed postMessage
                 |                           |
                 |                   Extension Host
                 |                           |
                 |                JSON-RPC 2.0 over stdio
                 |                           |
                 +-------------+-------------+
                               |
                    altai-agent-service
                               |
         IsanAgent + tools + MCP + skills + durable journal
```

Desktop may call `altai-agent-service` through a Tauri adapter without stdio.
VS Code launches one Rust host per trusted canonical workspace and speaks the
same versioned protocol over stdio.

### 4.1 Current implementation baseline

Cursor must inspect these upstream locations before changing a contract:

| Concern | Current source in `altai-app` | Baseline fact |
|---|---|---|
| Complete chat panel | `src/modules/ai/components/AiSidePanel.tsx` | This component tree is the visual source of truth |
| Transcript/events | `AiChat.tsx`, `agentEventBridge.ts`, `chatStore.ts` | Rich behavior exists but some transport calls are Tauri-specific |
| Composer | `AiInputBar.tsx` | Owns slash commands, files, attachments, terminal/diff context |
| Work and Inbox | `WorkHubPanel.tsx`, `TaskRunsPanel.tsx`, `AutomationsPanel.tsx`, `NotificationInboxPanel.tsx` | Must remain shared panel surfaces, not native Tree Views |
| Settings | `src/settings/SettingsContent.tsx` | UI is reusable; persistence and commands require ports |
| Desktop bridge | `src/modules/ai/lib/native.ts` | Large Tauri adapter that must not be imported by shared UI |
| Desktop runtime | `src-tauri/src/altai/agent/runtime.rs` | Contains the real long-lived IsanAgent behavior |
| Shared Rust service | `src-tauri/crates/altai-agent-service` | Currently partial and not yet the sole runtime owner |
| TypeScript protocol | `packages/agent-protocol` | Framing/schema foundation exists |
| Rust protocol/CLI | `src-tauri/crates/altai-protocol`, `src-tauri/crates/altai-cli` | Stdio server is currently below Desktop feature parity |

At the start of this plan, the stdio path uses a limited one-shot execution
model, restricts active-run concurrency, and does not implement the complete
approval, clarification, steer, settings, Work, Inbox, and automation surface.
Cursor must not paper over those gaps with Webview-only state.

The previously removed VS Code implementation is not a migration source. It
created separate HTML/Webview UI and separate Work/Inbox structures. Historical
code may be consulted only for isolated VS Code lifecycle lessons, never copied
as the product architecture.

## 5. Repository ownership

### `altaidevorg/altai-app`

Owns product-neutral shared assets:

- `packages/agent-ui`;
- `packages/agent-protocol`;
- `packages/host-contract`;
- `src-tauri/crates/altai-agent-service`;
- `src-tauri/crates/altai-protocol`;
- the `altai-agent-host` binary target;
- Desktop/Tauri adapters;
- compatibility fixtures shared by both hosts.

### `altaidevorg/altai-vscode`

Owns VS Code-specific assets:

- extension manifest and contribution points;
- Extension Host lifecycle;
- Webview bootstrap and bridge;
- VS Code workspace, editor, terminal, diff, notification, and command
  adapters;
- Workspace Trust and remote-extension behavior;
- native host artifact resolution;
- extension integration tests;
- VSIX packaging and Marketplace release workflows.

### `altaidevorg/isanagent`

Owns the provider-independent agent engine, agent lifecycle, tool execution,
and event production. VS Code never depends on IsanAgent directly; it depends
on ALTAI's service and protocol.

## 6. Cross-repository dependency strategy

Separate repositories must not cause source duplication. The release contract
is:

| Artifact | Producer | Consumer | Delivery |
|---|---|---|---|
| `@altai/agent-ui` | `altai-app` | Desktop + VS Code Webview | Public npm package |
| `@altai/agent-protocol` | `altai-app` | VS Code Extension Host | Public npm package |
| `@altai/host-contract` | `altai-app` | Desktop + VS Code adapters | Public npm package |
| `altai-agent-host` | `altai-app` | VS Code Extension Host | Checksummed platform release artifacts |

Rules:

1. Shared packages use SemVer and are published from tagged `altai-app`
   releases.
2. `altai-vscode` pins exact shared-package and native-host versions.
3. A compatibility table maps extension version, UI package, protocol, and
   native host version.
4. CI rejects a protocol-major mismatch.
5. Local development may link sibling package folders and use
   `ALTAI_AGENT_HOST_PATH` to point to a local debug binary. Local overrides
   are never committed to release manifests.
6. Published VSIX files contain the required native host for their target
   platform; first-run network downloading is not the default.

Example compatibility record:

```json
{
  "extension": "0.1.x",
  "agentUi": "0.1.0",
  "protocol": 1,
  "agentHost": "0.7.0"
}
```

## 7. Planned extension structure

```text
altai-vscode/
  .github/
    workflows/
      quality.yml
      integration.yml
      package.yml
      release.yml
  docs/
    ENGINEERING_PLAN.md
    PROTOCOL_COMPATIBILITY.md
    RELEASE.md
  resources/
    icons/
    native/<target>/altai-agent-host[.exe]
  src/
    extension/
      activate.ts
      commands.ts
      workspaceTrust.ts
      host/
        HostManager.ts
        HostProcess.ts
        HostResolver.ts
      rpc/
        RpcClient.ts
        capabilityStore.ts
      vscode/
        editorAdapter.ts
        workspaceAdapter.ts
        terminalAdapter.ts
        diffAdapter.ts
        notificationAdapter.ts
      webview/
        AltaiViewProvider.ts
        WebviewBridge.ts
        webviewHtml.ts
    webview/
      main.tsx
      VsCodeHostAdapter.ts
      vscodeTheme.ts
    shared/
      messages.ts
      validation.ts
  test/
    unit/
    integration/
    fixtures/
  scripts/
    verify-native-host.mjs
    package-target.mjs
  package.json
  tsconfig.json
  vite.config.ts
```

The exact directory names may change during implementation, but the boundary
between Extension Host, Webview, shared contracts, and native host must remain
explicit.

## 8. Host contracts

The shared UI depends on ports, not on Tauri or VS Code imports.

```ts
interface AgentRuntimePort {
  initialize(input: InitializeInput): Promise<Capabilities>;
  startRun(input: StartRunInput): Promise<RunRef>;
  steerRun(input: SteerRunInput): Promise<void>;
  cancelRun(input: CancelRunInput): Promise<void>;
  retryRun(input: RetryRunInput): Promise<RunRef>;
  respondToApproval(input: ApprovalResponse): Promise<void>;
  respondToClarification(input: ClarificationResponse): Promise<void>;
  compactContext(input: CompactContextInput): Promise<void>;
  replayRun(input: ReplayRunInput): Promise<ReplayPage>;
}

interface WorkspacePort {
  getWorkspace(): Promise<WorkspaceInfo>;
  getActiveFile(): Promise<FileContext | null>;
  getSelection(): Promise<SelectionContext | null>;
  searchFiles(query: string): Promise<FileMatch[]>;
  readFile(uri: string): Promise<FileContent>;
  openFile(uri: string, range?: Range): Promise<void>;
  openDiff(input: DiffInput): Promise<void>;
  getGitDiff(): Promise<GitDiffContext | null>;
  getTerminalContext(): Promise<TerminalContext | null>;
}

interface SettingsPort {
  getSettings(): Promise<AltaiSettings>;
  updateSettings(patch: SettingsPatch): Promise<AltaiSettings>;
  getProviderStatus(): Promise<ProviderStatus[]>;
  beginProviderConnection(input: ProviderConnectionInput): Promise<void>;
  clearProviderCredential(providerId: string): Promise<void>;
}

interface EventPort {
  subscribe(listener: (event: AgentEvent) => void): () => void;
}
```

Only adapter folders may import `@tauri-apps/*` or `vscode`.

## 9. Protocol surface

The existing stdio server is a starting point, not the finished API. Before
feature parity it must support:

| Domain | Required methods/events |
|---|---|
| Lifecycle | `initialize`, `capabilities`, `status`, `doctor`, `shutdown` |
| Sessions | list, get, create, rename, archive, delete, truncate |
| Runs | start, steer, cancel, retry, replay, queue |
| Interactive | approval response, clarification response/dismiss, compact |
| Models | list, provider status, fallback, selection |
| Permissions | ask, auto-edit, plan, bypass |
| Work | task runs, jobs, tickets, notifications |
| Automations | list, create, update, trigger, pause, delete |
| Review | proposal, approve/deny edit, checkpoint list/restore |
| Settings | get/update config, agents, context, hooks, LSP |
| MCP/Skills | list, status, configure, install, enable, restart |
| Events | message, reasoning, tool, usage, diff, subagent, lifecycle |

All requests and notifications use runtime validation on both sides. Unknown
event types are logged and ignored safely; invalid frames terminate only the
affected host connection and produce an actionable diagnostic.

## 10. Data ownership

Shared durable data belongs to Rust-backed storage:

- sessions and messages;
- ordered run/event journal;
- chat metadata;
- checkpoints;
- Work, Inbox, jobs, tickets, and automations;
- model, permission, compaction, agent, MCP, skill, and hook configuration.

Client-local state is limited to presentation details:

- panel width;
- last open surface;
- scroll position;
- dismissed onboarding hints;
- VS Code view placement.

Remote workspaces store workspace-scoped state where the remote extension host
runs. The plan does not promise automatic state sharing between unrelated
machines without a future authenticated sync service.

## 11. Delivery phases

### Phase 0 — Contracts and repository foundation

Deliverables:

- TypeScript extension/Webview build skeleton;
- lint, typecheck, unit test, bundle, and VSIX scripts;
- shared message envelope for Webview communication;
- protocol and capability version policy;
- architecture guard that prevents `vscode` imports in Webview code;
- compatibility document and CI placeholders.

Exit gate:

- extension activates in an Extension Development Host;
- an inert ALTAI view loads with CSP and no console errors;
- no copied ALTAI UI is introduced.

### Phase 1 — Shared ALTAI service

Implemented primarily in `altai-app`.

Deliverables:

- move the real long-lived IsanAgent runtime behind
  `altai-agent-service`;
- make Tauri a consumer of that service;
- support multiple sessions/runs and all permission modes;
- extract storage/config interfaces from Tauri-specific code;
- preserve current Desktop behavior.

Exit gate:

- Desktop passes its existing test suite through the new service;
- Tauri commands no longer own a separate agent-runtime implementation.

### Phase 2 — Production host protocol

Deliverables:

- replace one-shot/single-run stdio behavior with the shared service;
- complete run, interactive, replay, settings, Work, and Inbox methods;
- ordered event sequence numbers and reconnect replay cursor;
- cancellation and graceful shutdown;
- structured logs and redaction;
- protocol contract fixtures shared by Rust and TypeScript.

Exit gate:

- equivalent scripted runs through Tauri and stdio produce equivalent ordered
  normalized events;
- host crash/restart does not duplicate journaled messages.

### Phase 3 — Extract the exact shared UI

Implemented primarily in `altai-app`.

Deliverables:

- extract the complete `AiSidePanel` tree and styles;
- replace direct Tauri imports with host ports;
- inject event transport into the agent event bridge;
- move AI settings/session persistence behind shared services;
- publish preview versions of shared packages;
- make Desktop consume the published package source in-repo.

Exit gate:

- Desktop screenshot baselines remain within the agreed pixel threshold;
- Desktop feature tests pass;
- there is one source file for every shared UI component.

### Phase 4 — First real VS Code vertical slice

Deliverables:

- Activity Bar view and Webview bootstrapping;
- Workspace Trust gating;
- workspace-scoped native host lifecycle;
- initialize/capabilities handshake;
- session create/list/get;
- start, stream, cancel, replay;
- model and permission selection;
- Webview state restoration.

Exit gate:

- a trusted local workspace can run a real IsanAgent conversation;
- reload restores the transcript without duplicates;
- every visible control in the vertical slice works.

### Phase 5 — Coding workflow parity

Deliverables:

- active editor, selection, and `@file` context;
- workspace file search and bounded reads;
- git diff and attachment context;
- approval and clarification flows;
- steer/queue/compact/retry;
- VS Code diff editor integration;
- checkpoints and restore;
- slash commands and snippets;
- safe terminal-context behavior.

Exit gate:

- the core coding-agent matrix passes against local, Remote SSH, WSL, and Dev
  Container smoke environments where supported.

### Phase 6 — Product-surface parity

Deliverables:

- History;
- Work/Runs/Scheduled;
- Inbox/jobs/tickets;
- Settings sections relevant to the extension;
- Agents, MCP, skills, hooks, and LSP status;
- run inspector and usage data;
- accessible onboarding for moving the view to the Secondary Side Bar.

Exit gate:

- all capability-backed Desktop chat-panel surfaces are present in the shared
  UI and functional in VS Code;
- intentionally unsupported Desktop-IDE surfaces are documented and hidden.

### Phase 7 — Hardening and release

Deliverables:

- visual regression in light, dark, and high-contrast themes;
- keyboard, screen-reader, and reduced-motion validation;
- large-transcript and long-run performance tests;
- native host checksum and contents verification;
- macOS arm64/x64, Windows x64, and Linux x64 VSIX artifacts;
- Remote SSH, WSL, and Dev Container release smoke tests;
- Marketplace metadata, changelog, privacy, and security documentation;
- staged internal, alpha, beta, and stable channels.

Exit gate:

- release checklist and full feature matrix are green;
- no P0/P1 bug and no known visible dead action remains.

## 12. Explicit platform mappings

The shared chat UI is identical, but host-native actions map to VS Code:

| ALTAI action | VS Code implementation |
|---|---|
| Open file/range | `vscode.window.showTextDocument` |
| Review a diff | VS Code diff editor with temporary/base content provider |
| Active file/selection | Active text editor events |
| Workspace files | `vscode.workspace.fs` and bounded search |
| Notifications | VS Code information/warning/error messages |
| Open external URL | VS Code environment URI opener |
| Terminal injection | Explicit user action and VS Code terminal API |
| Panel location | Activity Bar view, user-movable to Secondary Side Bar |

The extension does not recreate ALTAI Desktop's editor, terminal, source
control, or preview browser. It integrates the shared chat surface with VS
Code's native equivalents.

## 13. Security requirements

1. Declare restricted behavior for untrusted workspaces.
2. Do not launch the Rust host until trust is granted.
3. Canonicalize the workspace path before assigning a host.
4. Start the host without invoking a shell; pass an explicit executable and
   argument array.
5. Validate every Webview message and RPC payload.
6. Use a strict Webview Content Security Policy and nonce.
7. Restrict Webview local resources to the built asset directory.
8. Redact credentials, authorization headers, and sensitive environment data
   from logs and error messages.
9. Keep provider credentials in the Rust credential facade/OS keychain.
10. Verify packaged native host checksums during CI and startup diagnostics.
11. Require explicit confirmation for bypass permission mode.
12. Add dependency, license, and secret scanning to CI.

## 14. Testing strategy

### Unit tests

- frame parser and JSON-RPC client;
- capability gating;
- host lifecycle state machine;
- Webview message validation;
- URI/path normalization;
- event reducer idempotency;
- settings and command mapping.

### Contract tests

- the same protocol fixtures execute in Rust and TypeScript;
- request/response schema compatibility;
- every event has an ordered sequence and replay behavior;
- protocol-major mismatch produces a clear upgrade error.

### Component and visual tests

- render `@altai/agent-ui` through a browser harness;
- compare Desktop and VS Code host-adapter stories at common panel widths;
- light, dark, high-contrast, reduced-motion, and screen-reader states;
- empty, streaming, approval, clarification, tool, error, Work, Inbox, and
  Settings states.

### Extension integration tests

- activation and view resolution;
- trusted/untrusted workspace transitions;
- local host start/stop/restart;
- real session/run/replay fixture;
- editor open and diff review;
- workspace folder change;
- Extension Host reload;
- native host missing/corrupt diagnostic.

### Release matrix

- macOS arm64 and x64;
- Windows x64;
- Linux x64;
- local workspace;
- Remote SSH;
- WSL;
- Dev Container.

Browser-only `vscode.dev` is not a v1 target because it cannot spawn the native
Rust host.

## 15. Observability and diagnostics

Provide one `ALTAI` output channel with structured, redacted logs for:

- extension version;
- UI/protocol/native-host compatibility versions;
- workspace trust state;
- host lifecycle transitions;
- RPC method, duration, and request ID without prompt contents by default;
- reconnect/replay cursor;
- actionable startup diagnostics.

Add commands:

- `ALTAI: Open Logs`;
- `ALTAI: Run Diagnostics`;
- `ALTAI: Restart Agent Host`;
- `ALTAI: Show Version Compatibility`;
- `ALTAI: Open Settings`.

Diagnostics must distinguish missing binary, incompatible protocol, permission
failure, bad provider configuration, host crash, and corrupted frame.

## 16. CI and release plan

Every pull request runs:

1. dependency install with frozen lockfile;
2. formatting and lint;
3. TypeScript typecheck;
4. unit and contract tests;
5. Webview production build;
6. extension package-content audit;
7. dependency/license/secret scan.

Nightly or release CI additionally runs:

- VS Code integration tests;
- cross-repository compatibility fixtures;
- visual regression;
- platform VSIX packaging;
- native-host checksum validation;
- remote-environment smoke tests.

Release channels:

- `internal`: CI artifact only;
- `alpha`: organization testers;
- `beta`: opt-in Marketplace pre-release;
- `stable`: feature matrix and release gates complete.

## 17. Pull request sequence

Do not combine these into one large Cursor change.

| PR | Repository | Scope | Depends on |
|---|---|---|---|
| A1 | `altai-app` | Define host contracts and capability schema | none |
| V1 | `altai-vscode` | TypeScript/VS Code/Webview foundation | A1 schema draft |
| A2 | `altai-app` | Move long-lived runtime into agent service | A1 |
| A3 | `altai-app` | Complete stdio lifecycle/run/event protocol | A2 |
| V2 | `altai-vscode` | Host manager and typed JSON-RPC client | A3 fixtures |
| A4 | `altai-app` | Extract shared `agent-ui` package | A1 |
| A5 | `altai-app` | Make Desktop consume shared UI | A4 |
| V3 | `altai-vscode` | Render shared UI with VS Code adapter | V1, A4 |
| V4 | `altai-vscode` | Real chat vertical slice | V2, V3, A3 |
| A6 | `altai-app` | Settings/Work/Inbox/full protocol parity | A3 |
| V5 | `altai-vscode` | Context, diff, approval, checkpoint parity | V4, A6 |
| V6 | `altai-vscode` | Work, Inbox, Settings, MCP, skills | V5, A6 |
| V7 | `altai-vscode` | Remote support, hardening, packaging | V6 |

PRs A2/A3 and V1 may progress in parallel, but V4 cannot be declared complete
against a mock or one-shot host.

## 18. Cursor execution rules

Use this document as the source of truth in Cursor.

For each task:

1. Read this plan and the relevant existing source before editing.
2. State which repository and boundary the task touches.
3. Keep one PR to one acceptance gate.
4. Do not duplicate shared ALTAI components to make progress faster.
5. Add or update tests in the same change.
6. Run the smallest relevant checks, then the repository-wide checks.
7. Record any protocol or capability change in the compatibility document.
8. Stop if a task requires changing a non-owned boundary without its contract.
9. Never leave a visible placeholder control enabled.
10. End each task with changed files, commands run, results, and remaining
    risks.

Suggested Cursor instruction prefix:

```text
Read docs/ENGINEERING_PLAN.md completely before editing. Work only on the
specified task and respect the repository ownership rules. Do not copy UI or
protocol code from altai-app into altai-vscode. Add tests with the change, run
the relevant checks, and report changed files plus verification results.
```

## 19. First twelve Cursor tasks

### TASK-001 — Extension foundation

Repository: `altai-vscode`

Create the TypeScript extension/Webview monorepo skeleton, strict TypeScript
configs, lint/test/build scripts, a minimal Activity Bar Webview View, CSP, and
an Extension Development Host launch configuration. Render only a neutral
"ALTAI host not connected" development state; do not recreate chat UI.

Acceptance:

- typecheck, lint, unit test, and build pass;
- extension activates and resolves its Webview;
- no `vscode` import is present in the Webview bundle;
- no copied ALTAI JSX/CSS exists.

### TASK-002 — Shared host-contract package

Repository: `altai-app`

Create the product-neutral host ports and capability schema. Adapt types from
existing behavior without moving UI yet. Add compile-time and runtime schema
tests.

Acceptance:

- package has no Tauri or VS Code dependency;
- every existing chat-panel action is represented or explicitly marked for a
  later capability;
- tests pass.

### TASK-003 — Webview bridge

Repository: `altai-vscode`

Implement typed, runtime-validated Webview request/response/event envelopes,
request IDs, timeouts, disposal, and safe unknown-message handling.

Acceptance:

- round-trip and timeout tests pass;
- invalid messages do not invoke handlers;
- Webview state uses the VS Code state API rather than retaining hidden
  contexts.

### TASK-004 — Agent service extraction

Repository: `altai-app`

Move the actual long-lived IsanAgent host lifecycle from the Tauri runtime into
`altai-agent-service`, then make Desktop call the service through an adapter.

Acceptance:

- all current permission modes work;
- Desktop behavior and tests remain green;
- no second long-lived runtime remains in Tauri commands.

### TASK-005 — Stdio parity slice

Repository: `altai-app`

Implement initialize/capabilities, session create/get/list, run start/cancel,
streaming events, replay cursor, and shutdown on the shared service. Remove the
single active run and plan-only restrictions for this slice.

Acceptance:

- a real IsanAgent run streams over stdio;
- replay is ordered and idempotent;
- Rust protocol fixtures pass.

### TASK-006 — Extension native host manager

Repository: `altai-vscode`

Implement trusted-workspace host resolution, explicit process spawn, lifecycle
state machine, JSON-RPC framing, structured logs, restart, and shutdown.

Acceptance:

- no host starts while untrusted;
- missing/crashing/incompatible hosts produce distinct diagnostics;
- integration fixture covers start, message, restart, and shutdown.

### TASK-007 — Shared UI extraction

Repository: `altai-app`

Extract `AiSidePanel` and its dependency tree into `@altai/agent-ui`. Replace
direct Tauri imports with the shared host ports. Make Desktop consume the new
package immediately.

Acceptance:

- Desktop uses the package source;
- screenshot and feature regressions pass;
- no duplicate component remains in the old path.

### TASK-008 — Shared UI in VS Code

Repository: `altai-vscode`

Render `@altai/agent-ui` in the Webview and implement only the capabilities
available from TASK-005/006. Map VS Code theme and accessibility classes into
the shared token layer.

Acceptance:

- UI comes from the package dependency;
- light/dark/high-contrast smoke screenshots pass;
- unavailable controls are hidden or disabled by capability state.

### TASK-009 — Real chat vertical slice

Repository: `altai-vscode`

Connect session list/create, start, event streaming, cancel, replay, model, and
permission controls through the bridge and native host.

Acceptance:

- no mock response path remains;
- reload restores the same transcript once;
- error and cancellation states are actionable.

### TASK-010 — Editor and context integration

Repository: `altai-vscode`

Implement active file, selection, bounded workspace search/read, open file,
git diff context, and attachment references through VS Code adapters.

Acceptance:

- URI handling works for local and remote schemes;
- secret/ignored-file policy is enforced by the Rust service;
- large/binary inputs are rejected with clear limits.

### TASK-011 — Interactive review workflow

Repositories: `altai-app`, then `altai-vscode`

Complete steer, queue, approval, clarification, compact, retry, edit proposal,
VS Code diff view, and checkpoint restore contracts and adapters.

Acceptance:

- every review action survives Webview reload;
- duplicate responses are rejected idempotently;
- restore shows a clear affected-file summary.

### TASK-012 — Product surfaces and release hardening

Repositories: `altai-app`, then `altai-vscode`

Complete Work, Inbox, Settings, automations, MCP, skills, diagnostics, remote
support, visual/accessibility tests, and target-specific VSIX release flows.

Acceptance:

- full feature matrix is green;
- package audit contains one correct native host per target;
- beta release checklist passes.

## 20. Initial estimates

These are engineering estimates, not fixed dates:

| Area | One engineer | Two coordinated engineers |
|---|---:|---:|
| Foundation and contracts | 1–2 weeks | 1 week |
| Shared service and protocol | 3–4 weeks | 2–3 weeks |
| Shared UI extraction | 1.5–2.5 weeks | 1–2 weeks |
| Core VS Code integration | 2–3 weeks | 1.5–2 weeks |
| Full surfaces and hardening | 2–3 weeks | 1.5–2.5 weeks |
| Total | 10–14 weeks | 7–10 weeks |

Do not compress the schedule by duplicating UI or bypassing service/protocol
work. That creates the exact visual drift and non-functional controls this
architecture is designed to prevent.

## 21. Definition of done

The extension is done when:

- shared source ownership is enforced technically and in review;
- all release capabilities are implemented end-to-end;
- every visible action has unit/contract/integration coverage appropriate to
  its risk;
- Desktop and VS Code pass the common behavior fixtures;
- UI visual baselines pass in supported themes and widths;
- secrets, trust, logs, and native artifacts pass security checks;
- local and supported remote environments pass smoke tests;
- version compatibility and recovery diagnostics are user-actionable;
- a clean machine can install the target VSIX and complete a real agent run.
