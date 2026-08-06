# Changelog

All notable changes to the ALTAI VS Code extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-08-06

Internal / pre-Marketplace slice. Shared `@altai/agent-ui` is still linked via
sibling `file:` packages until public npm publish.

### Added

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
