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
