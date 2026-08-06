/**
 * Pinned compatibility record for this extension build.
 * Update docs/PROTOCOL_COMPATIBILITY.md when these values change.
 */
export const COMPATIBILITY = {
  extension: "0.1.0",
  /** Matches sibling @altai/agent-ui package version (file: link until npm publish). */
  agentUi: "0.1.0",
  protocol: 1,
  /**
   * Stdio host via `altai-cli serve --stdio`.
   * Target-specific packaged host SemVer pins land when release binaries ship
   * (resources/native/<target> + sha256 in package:target).
   */
  agentHost: "stdio-via-altai-cli-serve",
} as const;
