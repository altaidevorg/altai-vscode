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

### Security

- Provider credentials never enter the Webview; native host is not started for
  untrusted workspaces.
- Packaged host integrity: optional `.sha256` sidecar verified at resolve time.

### Notes

- Packaged `altai-agent-host` binaries are not yet release-pinned; local debug
  uses `ALTAI_AGENT_HOST_PATH` (see [docs/RELEASE.md](docs/RELEASE.md)).
- Protocol major remains `1` (`stdio-via-altai-cli-serve`).

[0.1.0]: https://github.com/altaidevorg/altai-vscode/releases/tag/v0.1.0
