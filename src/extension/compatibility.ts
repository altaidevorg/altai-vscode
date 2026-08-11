/**
 * Pinned compatibility record for this extension build.
 * Update docs/PROTOCOL_COMPATIBILITY.md and resources/native/PIN.json together.
 */
export const COMPATIBILITY = {
  extension: "0.1.10",
  /** Matches sibling @altai/agent-ui package version (file: link until npm publish). */
  agentUi: "0.1.0",
  protocol: 1,
  /**
   * Native host id — must match resources/native/PIN.json `agentHost`.
   * Packaged binary is altai-cli built for serve --stdio.
   */
  agentHost: "0.1.0-cli-stdio",
} as const;
