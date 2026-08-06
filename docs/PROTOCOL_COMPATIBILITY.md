# Protocol compatibility

Pinned versions for this repository. Update this file whenever
`src/extension/compatibility.ts` or `resources/native/PIN.json` changes.

| Extension | `@altai/agent-ui` | Protocol major | `altai-agent-host` | Notes |
|---|---|---:|---|---|
| 0.1.0 | `0.1.0` (sibling `file:` until npm publish) | 1 | `0.1.0-cli-stdio` | Matches `resources/native/PIN.json`; binary is release `altai-cli` staged via `stage:native-host` / release.yml |

## Policy

1. `altai-vscode` pins exact shared-package and native-host versions.
2. `COMPATIBILITY.agentHost` **must** equal `PIN.json` `agentHost` (`npm run verify:host-pin`).
3. Local overrides (`ALTAI_AGENT_HOST_PATH`, linked packages) are never
   committed to release manifests. For local debug, point
   `ALTAI_AGENT_HOST_PATH` at an `altai-cli` (or fixture) binary that
   implements `serve --stdio`.
4. Alpha/real VSIX builds: `release.yml` builds `altai-cli --release` per OS,
   stages host + sha256, packages target VSIX artifacts.
5. Before cutting a tag, follow [RELEASE.md](RELEASE.md). Feature status:
   [FEATURE_MATRIX.md](FEATURE_MATRIX.md).
6. npm-published `@altai/*` packages replace `file:` links when registry
   versions land (packages remain sibling-linked for internal builds).
