# Changelog

All notable changes to the ALTAI VS Code extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.10] — 2026-08-07

- API key cards with a clear “Paste API key” field; opens Cursor’s top secure
  password bar (keys still never enter the Webview).
- Stronger key-entry guidance and focused InputBox title for each provider.
- Align extension compatibility metadata and release documentation with 0.1.10.
- Refresh the unlock tracker after shared UI, host RPC, multi-root, Markdown,
  and real-host packaging gates reached green.
- Refresh the locked `nanoid` transitively to remove the reported high-severity
  development dependency advisory.

## [0.1.9] — 2026-08-07

- BYOK: full provider catalog (OpenAI, Anthropic, Google, xAI, Groq, …) with
  Connect / Update key / Clear. Secrets only via Extension Host password prompt.
- Studio model catalog in the picker; selecting a model also sets host provider.
- Native host `providers/status` lists all known providers’ connected flags.

## [0.1.8] — 2026-08-07

- Settings polish: section search, quick-jump chips, host-offline banner,
  model/provider stats strip, About prefs JSON export.
- Persist last settings section; deep-link open can target a section.
- Context tab: compact active chat now; Models respect General → bypass pref.
- Composer #snippets load from Settings → Agents (plus workspace file).
- Accessibility data attributes apply for all surfaces (not only Chat).

## [0.1.7] — 2026-08-07

- Studio SettingsContent parity: general, shortcuts, models, context, agents,
  skills, github, languages, mcp, hooks, accessibility, host, about.
- Expanded `altai.*` configuration (AI, compaction budgets, snippets,
  accessibility). Workspace `writeTextFile` for `.isanagentignore`.
- Host config: failover model (`fallback_model`). Webview a11y data attributes.

## [0.1.6] — 2026-08-07

- Settings filled with Desktop-style SectionHeader + SettingRow layout.
- All sections always listed (icons tab strip); capability empty-states when host lacks support.
- Models as expanded selectable list; providers/MCP/skills/context use the same card rows.

## [0.1.5] — 2026-08-07

- Settings hub: section nav (General, Host, Providers, Models, Permissions,
  Context, MCP, Skills, About) with extension-specific preferences.
- VS Code configuration: `openPanelOnStartup`, `autoFocusComposer`,
  `showFollowupHints`, `rememberPermissionMode` (+ existing `agentHostPath`).
- Host tab: project root, trust, restart/recovery controls.
- Permission settings can enable Bypass with confirmation.

## [0.1.4] — 2026-08-07

- Mount shared `@altai/agent-ui` **AiComposer** (same slot order as Desktop).
- Settings: auto-compact toggle via host `settings.update` / `config/update`.
- Host ports accept compaction + bypass settings patches; CLI stores them.

## [0.1.3] — 2026-08-07

- Composer layout closer to Desktop AiInputBar: attachments slot, workspace
  context toolbar control, model config row, icon permission mode, Send ↑ / Stop
  (not dual text buttons).
- Provider/MCP/skills status moved out of the chat footer (still in Settings).

## [0.1.2] — 2026-08-07

- Side-chat chrome closer to Desktop: two-row AI topbar (Work/Inbox/inspector +
  Settings gear), clock/history + new-chat icons, chat tabs on the same row.
- Removed temporary lime install banner and Chat | Operations | Settings text tabs.

## [0.1.1] — 2026-08-07

- Chat chrome: History menu (not a side rail); no project-folder chip; no version/chat-id footer.
- Lime brand accent; force webview reload after rebuild; cache-bust assets.
- Visible shell banner for install verification (plugin host UI).

## [0.1.0] — 2026-08-06

Internal / pre-Marketplace slice. Shared `@altai/agent-ui` is still linked via
sibling `file:` packages until public npm publish.

### Added

- Force-reload webview when hidden; log extension root; `npm run` helper script for Extension Development Host path.
- VS Code host chrome: no project-folder chip, no extension/chat-id footer; session history is a History menu (not a side rail).
- Visual polish: ALTAI lime brand accent (Desktop tokens), compact Ready header, segmented Chat/Operations tabs.
- Chat layout density auto (sidebar/desktop by width); host error and config patch follow-ups from Desktop parity P2.
- Narrow Activity Bar chat layout: stack history above chat, collapsible Sessions rail; humanize host error codes in the panel.
- Ask About * menus/keybindings require a trusted workspace; untrusted attempts offer Manage Workspace Trust.
- Workspace-wide Ask About Problems scopes diagnostics to the preferred multi-root project root when set.
- Diagnostics report includes preferredWorkspaceRoot and all workspaceFolders.
- Thin VS Code host with trust-gated native agent host lifecycle over stdio.
- Capability-gated Chat surface: sessions, permission mode, model picker,
  provider status (Connect/Clear via Extension Host secret prompt), interactive
  approvals and clarifications.
- Operations shell: overview, Work / Runs / Inbox / Scheduled, composers,
  attention badge, deep-links, Chat deep-link + transcript hydrate.
- Package tooling: package-content audit, single-target
  `npm run package:target`, multi-target fixture VSIX CI (`package.yml`),
  `verify:vsix` archive audit.
- Security: secret-pattern scan and production dependency license allow-list in
  `npm run verify`.
- Diagnostics: `ALTAI: Run Diagnostics` with recovery hints per host failure
  code; workspace `extensionKind` for Remote SSH / WSL / Dev Containers.
- Marketplace **preview** metadata, 128×128 icon, feature matrix, and security
  summary docs for the internal channel.
- Native host pin `0.1.0-cli-stdio`, stage/build-host scripts, multi-OS
  `release.yml` real-host packaging, integration smoke + a11y shell checks.
- Chat mounts shared `@altai/agent-ui` chrome: `EmptyState`, `ComposerShell` /
  text area / primary row, and `ChatHistoryPanel`, with Tailwind token mapping
  onto VS Code theme variables so agent-ui classes render in the webview.
- Change review Apply/Deny when native host advertises
  `review/proposals/apply` + `review/proposals/deny` (`review.editProposal`).
  One-shot apply sends path/content; writes stay on the Rust host.
- Run details token chip accumulates host `usage` events (prompt +
  completion totals) instead of a static "live" placeholder.
- Skills status strip lists workspace-installed skills when the host
  advertises `skills/list` (`skills.list` capability). Install from GitHub
  (`owner/repo` or `owner/repo#skill`) when the host advertises
  `skills/install` (`skills.install`).
- Multi-root workspaces: project chip opens a QuickPick to pick the agent
  target folder, then reveals it in Explorer.
- Structured Chat message cards and shared `ChatTabStrip`, with run/event
  mapping fixed for nested `agent_message` envelopes (stream coalescing).
- Active-run composer follow-up: shared `ComposerFollowupBar` for Steer /
  Queue when host capabilities advertise them (⌘/Ctrl+Enter steers).
- User message Edit + resend (truncate + startRun) and assistant Retry hover
  actions when host capabilities allow.
- Chat composer context attach: active file (URI attachment), editor
  selection, git working-tree diff, and terminal context with shared chips.
- Composer `@file` picker: type `@` + query to search workspace files and
  attach a match (keyboard navigable).
- Composer compact control: shared `CompactNowControl` calls
  `runtime.compactContext` when the host advertises the capability.
- Edit checkpoints: shared `CheckpointMenuPanel` lists native checkpoints and
  restores when `review.checkpoints` / `review.restoreCheckpoint` allow it.
- Tool bubbles surface file path when present and offer Open via
  `workspace.openFile` when the host advertises it.
- `edit_diff` stream events become review rows with Diff (openDiff) and Open
  actions when host capabilities allow, plus an inline `UnifiedDiffPreview`.
- Chat message bodies segment absolute paths, `file://` URIs, and fenced code
  blocks; paths open via shared `ChatPathLink` + `workspace.openFile`.
  HTTP(S) links open via Extension Host `openExternal`.
- `todo_write` (and aliases) tool events render shared `TodoChecklist` cards.
- Change-review and run-blocked banners: `ChangeReviewBanner` for queued
  `edit_diff` rows and `RunBlockedBanner` on terminal run failures.
- Shared `RunRecoveryActions` when retry/steer/warn apply (Retry / Steer /
  Stop / Dismiss).
- Plan mode strip (`PlanModeStrip`) when permission mode is plan; sticky
  `TodoSummaryChip` showing the latest `todo_write` checklist.
- Empty Chat home starter chips (`PromptTemplateGrid`) that fill the composer.
- Composer attachments with a workspace URI expose Open actions via
  `workspace.openFile` (file + selection with uri).
- Shared `ComposerConfigRow` hosts the model picker; compact
  `ProviderConnectBanner` appears above the composer when no provider is
  connected (Connect routes secrets through Extension Host).
- Editor command **ALTAI: Ask About Selection** (context menu + ⌘/Ctrl+Alt+A)
  opens Chat with the current selection attached as composer context.
- Shared `WorkspaceTopbarActions` in the shell header opens Operations Work /
  Inbox when those capabilities are available (attention badge included).
- Editor command **ALTAI: Ask About Active File** (context menu + ⌘/Ctrl+Alt+F)
  opens Chat with the active workspace file as a URI attachment.
- Live `AgentStatusPill` shows thinking / streaming / approval / recoverable
  attention from run and transcript state.
- Active / blocked runs mount `RunDetailsHeader` + `RunOverviewCard` with stop
  and local metrics (turns, tools, edits, approvals).
- Composer shows shared `ChatProjectTarget` for the open workspace folder;
  click reveals the root in Explorer when `workspace.info` is available.
- Change-review panel opens from the change banner (diff + dismiss; no Apply
  without host `review.editProposal`).
- Topbar inspector toggles the Run details strip when available.
- MCP status strip when `mcp.list` is advertised; optional restart with
  `mcp.configure`.
- Replay toolbar control when `runtime.replayRun` is available.
- Composer **slash commands**: type `/` for built-in command suggestions;
  session actions (`/new`, `/stop`, `/retry`, `/compact`, …), Operations
  deep-links (`/tasks`, `/inbox`, `/automations`), plan toggle, change review,
  and prompt expansions (`/fix`, `/init`, …) for a normal agent turn.
- Composer **`#` snippets**: type `#` for suggestions (built-in `#pr`,
  `#testplan`, `#explain`, `#reproduce`, `#commitmsg`, plus optional workspace
  `.altai/snippets.json`). Tokens expand to `<snippet>` blocks on send;
  removable chips track picks.
- Session history soft-archives when `sessions.archive` is available (falls
  back to hard-delete only when archive is not advertised).
- Chat `startRun` / edit-resend pass the selected model id (omit `auto` for
  host-side routing).
- Run details inspector sections: Approvals / Todos / Changes / Activity from
  local transcript and pending prompt state (shared agent-ui inspectors).
- Transcript collapses consecutive tool rows (≥2 Read / Web / Ran / Tools) into
  shared `TranscriptToolGroup` chrome.
- MCP status: Enable/Disable when `mcp.configure` is available (alongside Restart).
- Operations new-task form: optional skill chips when `skills.list` is available
  (selected skills append `<skills>` blocks to the instruction).
- Settings surface tab collates provider / model / permission / MCP / skills
  chrome (capability-gated, no new secrets path).
- Composer `/settings` (and `/models`, `/permissions`, `/mcp`, `/skills`) open
  the Settings surface.
- Host wait shell surfaces diagnostic recovery hints (same copy as
  `ALTAI: Run Diagnostics`) when `host.status` carries a diagnostic code.
- Chat user/assistant messages offer Copy on hover when text is complete.
- **Copy chat** exports the full transcript as plain text to the clipboard.
- Surface tabs (Chat / Operations / Settings) support roving tabindex and
  arrow / Home / End keyboard navigation.
- Empty-home starters include `#pr` and `#testplan` snippet shortcuts.
- Settings About section shows extension version and host status, plus a
  pointer to Run Diagnostics.
- Empty home shows composer affordance hint: `/` commands · `#` snippets ·
  `@` files.
- Operations new-automation form offers the same skill chips as new-task runs.
- Wait shell exposes Open logs, Run diagnostics, and Restart host via an
  allowlisted Extension Host command (works even when the workspace is untrusted).
- `/help` (aliases `/?`, `/commands`) prints a filtered slash-command digest in
  the transcript.
- Unsent Chat composer text is restored across Webview reloads (presentation
  state only, capped).
- Slash `/logs`, `/diagnostics` (`/diag`), and `/restart-host` (`/restart`)
  invoke the allowlisted Extension Host recovery commands.
- Settings About exposes the same recovery buttons as the wait shell.
- When the host reports `host.untrusted`, recovery surfaces expose Manage
  workspace trust (allowlisted VS Code command).
- Slash `/new-task` and `/new-automation` open Operations compose forms
  (optional title from the command tail).
- Wait shell Copy diagnostic button builds a plain-text host recovery report.
- Clearing Chat focus removes `activeChatId` from Webview presentation state
  instead of leaving an empty string.
- Chat error banner is dismissible without clearing the draft or transcript.
- Slash `/version` (`/compat`) shows ALTAI version / protocol pin summary.
- Recovery action rows also include a Version button for the same command.
- Empty-home “List commands (/help)” runs the slash help action immediately.
- Escape dismisses Chat error and run blocked/warning banners.
- Composer git-diff attach synthesizes a path/status summary when VS Code Git
  has no real patch text; terminal attach accepts cwd when selection is empty.
- Empty-home slash starters are allowed to be short command tokens in tests.
- Status-bar ALTAI badge with attention > 0 opens Operations Inbox.
- Multi-root preferred project root is restored from Webview presentation state
  (display/Explorer only — does not rebind the agent host cwd).
- Slash `/copy` (`/export`) copies the current transcript as plain text.
- Settings About can Copy diagnostic (same text as the wait shell) and Escape
  also dismisses change-review / run-details chrome when no error banner is open.
- Empty-home starters also cover `/settings` and `/new` (dispatched immediately).
- Slash `/connect` (`/provider`) opens the Extension Host provider credential flow.
- Keyboard shortcut Cmd/Ctrl+Shift+Alt+A opens the ALTAI side panel.
- Slash `/disconnect` clears a provider credential via the Extension Host.
- Command palette **Ask About Working Tree** attaches a path/status summary via
  the selection deep-link (no `git` spawn).
- Command palette **Open Settings** focuses the side panel on the Settings surface.
- Keyboard shortcut Cmd/Ctrl+Alt+G runs **Ask About Working Tree**.
- Command palette lists **Open Settings** (registered contribution) with
  Cmd/Ctrl+Alt+, keybinding.
- Command palette **Ask About Terminal** (Cmd/Ctrl+Alt+T while terminal
  focused) attaches terminal context via the selection deep-link.
- Composer slash `/attach-diff` (`/wt`) and `/attach-terminal` (`/terminal`)
  add the same context chips as the attach menu.
- Composer slash `/attach-file` (`/file`) and `/attach-selection` (`/sel`)
  attach the active editor file and selection the same way.
- Status-bar attention badge opens **Operations Inbox** when count > 0
  (overview when zero).
- Terminal context attach falls back to the integrated terminal name when
  shell integration has not reported a cwd yet.
- Manifest `contributes.commands` must match `registerCommands` (unit gated).
- Recovery command allowlist is shared (`src/shared/hostRecoveryCommands.ts`)
  between Extension Host and Webview wait-shell buttons.
- Keybindings: Cmd/Ctrl+Shift+Alt+L logs, +D diagnostics, +O Operations.
- Empty-home starters for `/attach-diff` and `/tasks`.
- Status bar host badge when the agent host is connecting, disconnected, or
  erroring (errors open Run Diagnostics).
- Explorer and editor-title context menus expose Ask About Active File /
  Working Tree; explorer resource URI is preferred when provided.
- Composer draft persistence is debounced (empty drafts still flush
  immediately).
- Integrated terminal context menu: **Ask About Terminal**.
- Shared `formatGitDiffSummary` for Extension Host + Webview attach paths.
- README / architecture / feature matrix note host and attention status bars.
- Explorer **Ask About Active File** only targets files (not folders).
- ALTAI side-panel view title actions: Open Settings, Open Operations, Run
  Diagnostics.
- Keyboard shortcut Cmd/Ctrl+Shift+Alt+R restarts the agent host.
- Toast when the agent host recovers from error to ready (for example after
  restart).
- VS Code setting `altai.agentHostPath` for absolute host path override
  (settings beat `ALTAI_AGENT_HOST_PATH`).
- Host-missing recovery copy mentions `altai.agentHostPath`.
- Host error status shows a toast with Run Diagnostics / Restart Host actions
  (once per error entry).
- Getting Started walkthrough plus **ALTAI: Get Started Walkthrough** command.
- Composer slash `/walkthrough` (`/intro`) opens the Getting Started walkthrough.
- Empty-home starter and wait-shell / Settings recovery include **Get started**.
- Architecture overview + feature matrix list Getting Started walkthrough.
- OpenAI Compatible connect (palette / webview) prompts for http(s) base URL
  before the API key.
- Terminal context uses the right-clicked terminal and tracks last shell
  command (shell integration) for Attach / Ask About Terminal.
- Working-tree attach prefers Explorer resource repo, then falls back to the
  first multi-root repository with presentation changes.
- SCM resource context Ask About File; Inbox keybinding Cmd/Ctrl+Shift+Alt+I;
  menus no longer require `file://` scheme only.
- **ALTAI: Open Extension Settings** opens VS Code settings filtered to this
  extension; recovery shows it when the host binary is missing.
- **Run Diagnostics** toast offers Copy report and Open logs actions.
- Side-panel title icons plus Inbox / Logs / Restart / Get started overflow;
  walkthrough completion events + optional host-path step.
- Host error/recovery toasts pick actions from diagnostic code (Trust / Host
  path / Open ALTAI).
- README shortcut table for common keybindings.
- Multi-root project chip preference also drives preferred git working-tree
  target (until Explorer/SCM overrides).
- Host status-bar click routes by diagnostic code (Trust / Host path /
  Diagnostics); disconnected-with-diagnostic uses the same recovery command.
- Composer slash `/extension-settings` (`/host-path`) opens ALTAI extension
  settings.
- No open folder yields `host.no_workspace` with Open Folder recovery (toast,
  status bar, wait shell).
- Host re-reads the first workspace folder on each start and restarts when
  folders change (empty window → open folder without reloading the window).
- Architecture overview + feature matrix note dynamic workspace root recovery.
- Project chip preferred folder also drives native-host `--workspace` (restart
  only when the root actually changes).
- Palette **Restart Agent Host** always force-restarts (skip applies only to
  automatic same-root restarts).
- `altai.agentHostPath` and workspace-folder changes also force-restart so root
  skip cannot leave a stale binary/process.
- Diagnostics report includes the last host `--workspace` root.
- Preferred multi-root host folder is restored from workspaceState before the
  first host start; `getWorkspace().currentDir` follows that preference.
- **ALTAI: Copy Diagnostics Report** (palette, recovery, `/copy-diag`) copies
  the report via Extension Host clipboard.
- Composer `@file` / workspace search honors VS Code `files.exclude` and
  `search.exclude` (plus `.git` / `node_modules`).
- Editor title and SCM title actions for Ask About Active File / Working Tree.
- Virtual-only workspaces (vscode-vfs / vscode.dev) fail with
  `host.virtual_workspace` and Open Folder recovery.
- Multi-cursor editor selections join into one selection context attach.
- Explorer multi-select Ask About Active File attaches up to four file chips.
- Window progress “ALTAI agent host is starting…” while host status is connecting.
- Command palette hides Ask About / Operations entries when no folder is open.
- Architecture overview / feature matrix reflect preferred-root persistence and
  virtual-workspace diagnostics.
- Side-panel title overflow includes Copy Diagnostics Report.
- **ALTAI: Ask About Problems** attaches language diagnostics for the active
  file as selection context.
- Problems panel context menu and workspace-wide Problems attach (when no file
  is focused) with multi-file caps.
- Keybinding Cmd/Ctrl+Alt+P for Ask About Problems (README shortcut table).
- **ALTAI: Pick Project Root** sets multi-root preferred host folder (palette /
  explorer folder context).
- Composer `@file` search scopes to the preferred host project root when set.
- Composer slash `/attach-problems` (`/errors`) runs Ask About Problems.
- Composer slash `/pick-root` runs Pick Project Root.
- README shortcuts mention Problems, Pick Project Root, and Copy Diagnostics.

### Changed

- No auto-open Getting Started on first activate; walkthrough remains opt-in
  via command, `/walkthrough`, panel, and recovery (VS Code AI plugin, not app
  installer UX). Removed `altai.openWalkthroughOnInstall`.

### Security

- Provider credentials never enter the Webview; native host is not started for
  untrusted workspaces.
- Packaged host integrity: optional `.sha256` sidecar verified at resolve time.
- Secret-pattern and license scans run in `npm run verify`.

### Notes

- Native host id is `0.1.0-cli-stdio` (`resources/native/PIN.json`). Binaries
  are staged from `altai-cli --release` via `build:native-host` / `release.yml`.
- Shared UI packages remain `file:` linked until npm publish (org `NPM_TOKEN`).
- Marketplace remains **preview**; pre-release publish uses `VSCE_PAT`.

[0.1.0]: https://github.com/altaidevorg/altai-vscode/releases/tag/v0.1.0
