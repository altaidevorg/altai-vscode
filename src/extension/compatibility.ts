/**
 * Pinned compatibility record for this extension build.
 * Update docs/PROTOCOL_COMPATIBILITY.md when these values change.
 */
export const COMPATIBILITY = {
  extension: "0.1.0",
  agentUi: "pending",
  protocol: 1,
  /** Stdio host via `altai-cli serve`; packaged binary pin lands with release packaging. */
  agentHost: "stdio-via-altai-cli-serve",
} as const;
