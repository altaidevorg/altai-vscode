/**
 * Best-effort attention badge updater when Chat is open (Operations unmounted).
 * OperationsPanel remains the source of truth when that surface is visible.
 */

import {
  useCapability,
  useHostPorts,
  useHostPortsContext,
} from "@altai/agent-ui";
import { useCallback, useEffect, useRef } from "react";
import {
  fetchOperationsAttentionCount,
  shouldRefreshAttentionOnEvent,
} from "./operationsAttentionPoll.js";

export type OperationsAttentionReporterProps = {
  onCount: (count: number) => void;
};

export function OperationsAttentionReporter({
  onCount,
}: OperationsAttentionReporterProps) {
  const ports = useHostPorts();
  const { capabilities } = useHostPortsContext();
  const canTaskRuns = useCapability("work.taskRuns");
  const canInbox = useCapability("inbox.notifications");
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const refresh = useCallback(async () => {
    if (!capabilities) {
      return;
    }
    try {
      const count = await fetchOperationsAttentionCount(
        { taskRuns: canTaskRuns, inbox: canInbox },
        {
          listTaskRuns: () => ports.work.listTaskRuns(),
          listNotifications: () => ports.inbox.listNotifications(),
        },
      );
      onCountRef.current(count);
    } catch {
      /* Status-bar badge is best-effort presentation. */
    }
  }, [ports, capabilities, canTaskRuns, canInbox]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(
    () =>
      ports.events.subscribe((event) => {
        if (shouldRefreshAttentionOnEvent(event.type)) {
          void refresh();
        }
      }),
    [ports, refresh],
  );

  return null;
}
