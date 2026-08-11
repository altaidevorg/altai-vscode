/**
 * Best-effort attention badge updater when Chat is open (Operations unmounted).
 * The canonical Work Inbox remains the source of truth on every surface.
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
import {
  createCoalescedAsyncGate,
  shouldRequestWorkInboxRefresh,
  WORK_INBOX_POLL_INTERVAL_MS,
} from "./workOsRefresh.js";

export type OperationsAttentionReporterProps = {
  onCount: (count: number) => void;
};

export function OperationsAttentionReporter({
  onCount,
}: OperationsAttentionReporterProps) {
  const ports = useHostPorts();
  const { capabilities } = useHostPortsContext();
  const canInbox = useCapability("work.inbox");
  const onCountRef = useRef(onCount);
  const generationRef = useRef(0);
  const refreshExecutorRef = useRef<() => Promise<void>>(async () => {});
  const refreshGateRef = useRef<ReturnType<
    typeof createCoalescedAsyncGate
  > | null>(null);
  if (!refreshGateRef.current) {
    refreshGateRef.current = createCoalescedAsyncGate(() =>
      refreshExecutorRef.current(),
    );
  }
  onCountRef.current = onCount;

  refreshExecutorRef.current = async () => {
    const generation = ++generationRef.current;
    if (!capabilities) {
      return;
    }
    try {
      const count = await fetchOperationsAttentionCount(
        canInbox,
        { listWorkInbox: () => ports.inbox.listWorkInbox() },
      );
      if (generation !== generationRef.current) return;
      onCountRef.current(count);
    } catch {
      /* Keep the last-known badge on query errors, matching Desktop. The
       * unavailable-capability path above is the only path that reports zero. */
    }
  };

  const requestRefresh = useCallback((): Promise<void> => {
    return refreshGateRef.current!.request();
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    void requestRefresh();
    return () => {
      generationRef.current += 1;
      refreshGateRef.current?.cancelPending();
    };
  }, [ports, capabilities, canInbox, requestRefresh]);

  useEffect(() => {
    if (!capabilities || !canInbox) return;
    const interval = window.setInterval(() => {
      if (
        shouldRequestWorkInboxRefresh("poll", {
          visibilityState: document.visibilityState,
        })
      ) {
        void requestRefresh();
      }
    }, WORK_INBOX_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [capabilities, canInbox, requestRefresh]);

  useEffect(() => {
    const onFocus = () => {
      if (shouldRequestWorkInboxRefresh("focus")) {
        void requestRefresh();
      }
    };
    const onVisibility = () => {
      if (
        shouldRequestWorkInboxRefresh("visibility", {
          visibilityState: document.visibilityState,
        })
      ) {
        void requestRefresh();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [requestRefresh]);

  useEffect(
    () =>
      ports.events.subscribe((event) => {
        if (shouldRefreshAttentionOnEvent(event.type)) {
          void requestRefresh();
        }
      }),
    [ports, requestRefresh],
  );

  return null;
}
