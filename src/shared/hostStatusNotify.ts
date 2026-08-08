/**
 * Pure policy for Extension Host host-status toast notifications.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.112). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export type HostLifecycleStatus =
  | "disconnected"
  | "connecting"
  | "ready"
  | "error";

/**
 * After an errored host becomes ready again (e.g. restart / trust grant / path
 * fix), surface a one-shot recovery toast. No toast on first-ever ready.
 */
export function shouldNotifyHostRecovered(
  previous: HostLifecycleStatus | undefined,
  next: HostLifecycleStatus,
): boolean {
  return previous === "error" && next === "ready";
}
