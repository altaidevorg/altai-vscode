# Security and privacy (VS Code extension)

This document is the short, user-facing security summary for ALTAI for VS Code.
Architecture detail lives in [ENGINEERING_PLAN.md](ENGINEERING_PLAN.md) §13.

## Trust boundary

- The extension declares **limited** support for untrusted workspaces.
- The **native agent host is not started** until Workspace Trust is granted.
- Visible agent actions are enabled only when the host advertises the matching
  **capability** after a successful initialize.
- Webview recovery buttons only invoke an **allowlisted** set of Extension Host
  commands (logs, diagnostics, restart, version, provider connect/clear, manage
  workspace trust). Free-form `executeCommand` is not exposed.

## Secrets

- Provider credentials and passwords are collected only in the **Extension Host**
  (e.g. `ALTAI: Connect AI Provider`, Chat provider Connect) via VS Code secret
  input prompts.
- **Secrets never enter the Webview** and are not passed through `postMessage`
  payloads for storage.
- Durable credential storage is owned by the native host credential facade /
  OS keychain, not by Webview `localStorage`.

## Native host and process spawn

- The host is started with an **explicit executable path and argument array**
  (no shell). Prefer packaged `resources/native/<platform-arch>/` binaries with
  optional `.sha256` integrity checks; local debug may set
  `altai.agentHostPath` or `ALTAI_AGENT_HOST_PATH` to an absolute path.
- Remote SSH / WSL / Dev Containers: the extension uses `extensionKind:
  workspace` so the host runs on the **remote** machine next to the workspace.

## Logging

- Structured logs go to the **ALTAI** output channel.
- Host stderr redaction strips common credential-shaped assignments before
  logging (tokens, API keys, passwords). Do not paste full secrets into chat or
  diagnostics reports.

## Package integrity

- PR CI runs secret-pattern scanning and production dependency license
  allow-listing (`npm run verify:security`).
- Packaged VSIX layout is audited (`verify:package`, `verify:vsix`).
- Release target VSIX builds must ship one host per artifact (see
  [RELEASE.md](RELEASE.md)).

## Reporting

- Security issues: open a private report to the
  [altaidevorg/altai-vscode](https://github.com/altaidevorg/altai-vscode)
  maintainers (or your organization security contact). Do not file public
  issues that include credentials or private workspace paths.
