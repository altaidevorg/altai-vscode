/**
 * Pure policy for Extension Host host-status toast notifications.
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
