# Protocol compatibility

Pinned versions for this repository. Update this file whenever
`src/extension/compatibility.ts` changes.

| Extension | `@altai/agent-ui` | Protocol major | `altai-agent-host` | Notes |
|---|---|---:|---|---|
| 0.1.0 | `0.1.0` (sibling `file:` until npm publish) | 1 | `stdio-via-altai-cli-serve` | Internal **preview** channel; Chat + Operations gated by host capabilities; packaged host SemVer pins land with alpha host artifacts |

## Policy

1. `altai-vscode` pins exact shared-package and native-host versions.
2. CI must reject a protocol-major mismatch once host packaging lands.
3. Local overrides (`ALTAI_AGENT_HOST_PATH`, linked packages) are never
   committed to release manifests. For local debug, point
   `ALTAI_AGENT_HOST_PATH` at an `altai-cli` (or fixture) binary that
   implements `serve --stdio`.
4. Before cutting alpha+, follow [RELEASE.md](RELEASE.md) and keep
   `CHANGELOG.md` in sync with `package.json` version
   (`npm run verify:release-docs`).
5. Feature status for the current channel is tracked in
   [FEATURE_MATRIX.md](FEATURE_MATRIX.md).
