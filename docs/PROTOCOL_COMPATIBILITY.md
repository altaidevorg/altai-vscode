# Protocol compatibility

Pinned versions for this repository. Update this file whenever
`src/extension/compatibility.ts` changes.

| Extension | `@altai/agent-ui` | Protocol major | `altai-agent-host` | Notes |
|---|---|---:|---|---|
| 0.1.0 | pending | 1 | `stdio-via-altai-cli-serve` | TASK-006 host manager; packaged binary pin pending release packaging |

## Policy

1. `altai-vscode` pins exact shared-package and native-host versions.
2. CI must reject a protocol-major mismatch once host packaging lands.
3. Local overrides (`ALTAI_AGENT_HOST_PATH`, linked packages) are never
   committed to release manifests. For local debug, point
   `ALTAI_AGENT_HOST_PATH` at an `altai-cli` (or fixture) binary that
   implements `serve --stdio`.
