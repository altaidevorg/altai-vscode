# Release guide

How to cut an ALTAI VS Code extension build for the channels defined in the
engineering plan: **internal → alpha → beta → stable**.

For architecture and compatibility pins see
[ENGINEERING_PLAN.md](ENGINEERING_PLAN.md) and
[PROTOCOL_COMPATIBILITY.md](PROTOCOL_COMPATIBILITY.md).

## Channels

| Channel | Audience | Distribution | Exit criteria |
|---|---|---|---|
| `internal` | Maintainers | CI `package.yml` fixture VSIX artifacts | `npm run verify` green; package matrix green |
| `alpha` | Org testers | Private / org feed with host binaries | Checklist below + real agent run on one macOS + one Linux |
| `beta` | Opt-in Marketplace pre-release | VS Marketplace pre-release | Alpha criteria + Remote SSH smoke |
| `stable` | Public Marketplace | VS Marketplace stable | Full feature matrix; no P0/P1; pinned host checksums |

## Pre-release checklist

Copy into the release PR description and check every box for the target channel.

### Compatibility

- [ ] `package.json` `version` matches `COMPATIBILITY.extension` and a
      `## [x.y.z]` section in `CHANGELOG.md`
- [ ] `docs/PROTOCOL_COMPATIBILITY.md` updated for UI package, protocol major,
      and `altai-agent-host` pin
- [ ] Protocol major bump (if any) documented with migration notes

### Quality

- [ ] `npm run verify` green locally (typecheck, lint, tests, build, guards,
      package audit, security)
- [ ] CI `quality` workflow green
- [ ] CI `package` workflow green for all release targets
      (`darwin-arm64`, `darwin-x64`, `linux-x64`, `win32-x64`)

### Packaging (alpha+)

- [ ] Real host binary per target staged via
      `npm run package:target -- --target=<t> --host=<path>`
- [ ] Each VSIX passes `npm run verify:vsix -- --vsix=<file> --target=<t>`
- [ ] Exactly one `resources/native/<target>/` tree; `.sha256` present and valid
- [ ] No source maps or `src/` / `test/` trees in the VSIX
- [ ] VSIX installs on a clean machine / empty profile

### Runtime smoke (alpha+)

- [ ] Workspace Trust: host does **not** start until trusted
- [ ] Trust + host: `ALTAI: Run Diagnostics` shows lifecycle Ready (or clear
      Missing recovery when override is unset)
- [ ] Provider Connect prompts via Extension Host input (no secret in Webview)
- [ ] Start run / stream / cancel on a trusted local workspace
- [ ] Operations open + at least one deep-link command works

### Remote smoke (beta+)

- [ ] Remote SSH (or WSL / Dev Container): extension runs as **workspace**
      kind on remote
- [ ] Host binary resolves on the remote (packaged or `ALTAI_AGENT_HOST_PATH`)
- [ ] Diagnostics report `remoteName` non-local

### Security / privacy

- [ ] Secret scan + license audit part of verify (no opt-out for release)
- [ ] No credentials in logs (`ALTAI: Open Logs` sample redacts tokens)
- [ ] README / Marketplace description disclose: workspace trust boundary,
      local native host, no secrets in Webview

### Marketplace packaging (beta+)

- [ ] `publisher`, `repository`, `license`, icon/media assets present
- [ ] CHANGELOG current; version tag `vX.Y.Z` created after merge
- [ ] Pre-release flag set only for beta channel

## Commands

```bash
# Full gate
npm run verify

# Single-target release VSIX (host binary required)
npm run package:target -- --target=linux-x64 --host=/path/to/altai-agent-host

# Audit a built VSIX
npm run verify:vsix -- --vsix=altai-0.1.0-linux-x64.vsix --target=linux-x64
```

## Versioning rules

1. Bump `package.json` `version` and `COMPATIBILITY.extension` together.
2. Add a Keep a Changelog section in `CHANGELOG.md` for that version
   **before** tagging.
3. Never commit `ALTAI_AGENT_HOST_PATH` or real host binaries into git;
   release CI/CD injects signed hosts at package time.
4. Protocol-major mismatches must fail host initialize once packaged binary
   pins land (see protocol compatibility policy).

## Current gaps (track for beta)

- Real signed `altai-agent-host` artifacts per target (fixture hosts only in CI).
- Published `@altai/agent-ui` / `@altai/host-contract` npm versions (still
  `file:` links).
- Automated Remote SSH e2e in CI.
- Visual / a11y regression suite.
