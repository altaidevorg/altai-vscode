/**
 * Friendly labels for HostManager lifecycle status shown in the shell.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.109). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export function hostStatusPillLabel(status: string): string {
  switch (status.trim().toLowerCase()) {
    case "ready":
      return "Ready";
    case "starting":
    case "restarting":
      return "Starting…";
    case "disconnected":
      return "Disconnected";
    case "error":
    case "crashed":
      return "Error";
    default:
      return status.length > 0 ? status : "Unknown";
  }
}

/**
 * Whether the host status message is redundant under the Ready pill.
 */
export function shouldShowHostSubtitle(
  status: string,
  message: string | undefined,
): boolean {
  const normalized = status.trim().toLowerCase();
  if (normalized !== "ready") {
    return Boolean(message?.trim());
  }
  const m = message?.trim().toLowerCase() ?? "";
  if (!m) {
    return false;
  }
  // Skip generic ready chatter so EmptyState owns "· ready".
  if (
    m === "altai host ready" ||
    m === "host ready" ||
    m === "ready" ||
    m.includes("host ready")
  ) {
    return false;
  }
  return true;
}
