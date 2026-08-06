/**
 * VS Code mount of the shared Operations surfaces.
 *
 * Renders `OperationsNavigationShell` with capability-gated Overview / Work /
 * Runs / Inbox. Overview aggregates Work+Inbox ports (`operationsOverview.ts`);
 * domain routes list the same data through shared cards. There is no
 * webview-owned durable store — a canonical OperationsSummary projection
 * replaces host aggregation later (CP-17).
 */

import {
  OperationsNavigationShell,
  OperationsOverview,
  useCapability,
  useHostPorts,
  useHostPortsContext,
  type OperationsView,
  type WorkHubView,
} from "@altai/agent-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OpenOperationsPayload } from "../shared/messages.js";
import {
  OperationsDomainStatus,
  OperationsInboxDomain,
  OperationsRunsDomain,
  OperationsWorkDomain,
} from "./OperationsDomainViews.js";
import {
  resolveDeepLinkOperationsView,
  resolveDeepLinkWorkHubView,
} from "./operationsDeepLink.js";
import {
  buildOperationsOverview,
  EMPTY_OPERATIONS_DATA,
  type OperationsOverviewData,
} from "./operationsOverview.js";
import { resolveAvailableOperationsViews } from "./operationsRoutes.js";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: OperationsOverviewData };

export type OperationsPanelProps = {
  /** Deep-link from Extension Host commands; reapplied when `key` changes. */
  navigation?: OpenOperationsPayload;
};

export function OperationsPanel({ navigation }: OperationsPanelProps) {
  const ports = useHostPorts();
  const { capabilities } = useHostPortsContext();
  const canTaskRuns = useCapability("work.taskRuns");
  const canAutomations = useCapability("work.automations");
  const canInbox = useCapability("inbox.notifications");
  const [view, setView] = useState<OperationsView>("overview");
  const [workHubView, setWorkHubView] = useState<WorkHubView>("runs");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const flags = useMemo(
    () => ({
      taskRuns: canTaskRuns,
      automations: canAutomations,
      inbox: canInbox,
    }),
    [canTaskRuns, canAutomations, canInbox],
  );

  const availableViews = useMemo(
    () => resolveAvailableOperationsViews(flags),
    [flags],
  );

  useEffect(() => {
    if (!navigation) return;
    setView(resolveDeepLinkOperationsView(navigation.view, flags));
    setWorkHubView(
      resolveDeepLinkWorkHubView(navigation.workHubView, flags),
    );
  }, [navigation, flags]);

  useEffect(() => {
    if (!availableViews.includes(view)) {
      setView("overview");
    }
  }, [availableViews, view]);

  const load = useCallback(async () => {
    // Capabilities are null until runtime.initialize completes; the effect
    // re-runs when they arrive, so stay in the loading state until then.
    if (!capabilities) {
      return;
    }
    try {
      const [taskRuns, automations, notifications] = await Promise.all([
        canTaskRuns ? ports.work.listTaskRuns() : Promise.resolve([]),
        canAutomations ? ports.work.listAutomations() : Promise.resolve([]),
        canInbox ? ports.inbox.listNotifications() : Promise.resolve([]),
      ]);
      setState({
        status: "ready",
        data: { taskRuns, automations, notifications },
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [ports, capabilities, canTaskRuns, canAutomations, canInbox]);

  useEffect(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  useEffect(
    () =>
      ports.events.subscribe((event) => {
        if (event.type === "lifecycle" || event.type === "notification") {
          void load();
        }
      }),
    [ports, load],
  );

  const data =
    state.status === "ready" ? state.data : EMPTY_OPERATIONS_DATA;
  const viewModel = buildOperationsOverview(data);

  const withBusy = useCallback(
    async (id: string, action: () => Promise<void>) => {
      setActionBusyId(id);
      try {
        await action();
        await load();
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setActionBusyId(null);
      }
    },
    [load],
  );

  const taskActions = {
    busyId: actionBusyId,
    onRetry: (id: string) => {
      void withBusy(id, () => ports.work.retryTaskRun(id).then(() => undefined));
    },
    onStop: (id: string) => {
      void withBusy(id, () => ports.work.cancelTaskRun(id));
    },
    onRemove: (id: string) => {
      void withBusy(id, () => ports.work.removeTaskRun(id));
    },
  };

  const automationActions = {
    busyId: actionBusyId,
    onTrigger: (id: string) => {
      void withBusy(id, () => ports.work.triggerAutomation(id));
    },
    onPause: (id: string) => {
      void withBusy(id, () => ports.work.pauseAutomation(id));
    },
    onDelete: (id: string) => {
      void withBusy(id, () => ports.work.deleteAutomation(id));
    },
  };

  return (
    <OperationsNavigationShell
      view={view}
      onViewChange={setView}
      availableViews={availableViews}
    >
      {view === "overview" ? (
        <OperationsOverview
          status={
            state.status === "error"
              ? "error"
              : state.status === "ready"
                ? "ready"
                : "loading"
          }
          {...(state.status === "error"
            ? {
                errorMessage: state.message,
                onDismissError: () => {
                  setState({ status: "loading" });
                  void load();
                },
              }
            : {})}
          metrics={viewModel.metrics}
          attention={viewModel.attention}
          progressing={viewModel.progressing}
        />
      ) : null}

      {view === "work" ? (
        state.status !== "ready" ? (
          <OperationsDomainStatus
            status={state.status === "error" ? "error" : "loading"}
            errorMessage={
              state.status === "error" ? state.message : undefined
            }
            onRetry={() => {
              setState({ status: "loading" });
              void load();
            }}
          />
        ) : (
          <OperationsWorkDomain
            taskRuns={data.taskRuns}
            automations={data.automations}
            canTaskRuns={canTaskRuns}
            canAutomations={canAutomations}
            hubView={workHubView}
            actions={taskActions}
            automationActions={automationActions}
          />
        )
      ) : null}

      {view === "runs" ? (
        state.status !== "ready" ? (
          <OperationsDomainStatus
            status={state.status === "error" ? "error" : "loading"}
            errorMessage={
              state.status === "error" ? state.message : undefined
            }
            onRetry={() => {
              setState({ status: "loading" });
              void load();
            }}
          />
        ) : (
          <OperationsRunsDomain
            taskRuns={data.taskRuns}
            actions={taskActions}
          />
        )
      ) : null}

      {view === "inbox" ? (
        state.status !== "ready" && state.status !== "error" ? (
          <OperationsDomainStatus
            status="loading"
            onRetry={() => {
              void load();
            }}
          />
        ) : (
          <OperationsInboxDomain
            notifications={data.notifications}
            actions={{
              busyId: actionBusyId,
              loading: false,
              error: state.status === "error" ? state.message : null,
              markingAllRead,
              onRefresh: () => {
                void load();
              },
              onMarkSeen: (id) => {
                void withBusy(id, () => ports.inbox.markNotificationSeen(id));
              },
              onResolve: (id) => {
                void withBusy(id, () => ports.inbox.resolveNotification(id));
              },
              onMarkAllRead: () => {
                void (async () => {
                  setMarkingAllRead(true);
                  try {
                    const unread = data.notifications.filter((item) => !item.seen);
                    await Promise.all(
                      unread.map((item) =>
                        ports.inbox.markNotificationSeen(item.id),
                      ),
                    );
                    await load();
                  } catch (error) {
                    setState({
                      status: "error",
                      message:
                        error instanceof Error
                          ? error.message
                          : String(error),
                    });
                  } finally {
                    setMarkingAllRead(false);
                  }
                })();
              },
            }}
          />
        )
      ) : null}
    </OperationsNavigationShell>
  );
}
