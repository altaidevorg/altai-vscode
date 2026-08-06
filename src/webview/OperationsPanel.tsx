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
  countOperationsAttention,
  EMPTY_OPERATIONS_DATA,
  overviewActiveRunId,
  overviewFailedRunId,
  overviewUnreadInboxId,
  withOverviewRowNavigation,
  type OperationsOverviewData,
} from "./operationsOverview.js";
import { resolveAvailableOperationsViews } from "./operationsRoutes.js";
import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: OperationsOverviewData };

export type OperationsPanelProps = {
  /** Deep-link from Extension Host commands; reapplied when `key` changes. */
  navigation?: OpenOperationsPayload;
  /** Restored presentation from Webview getState(). */
  initialView?: OperationsView;
  initialWorkHubView?: WorkHubView;
  /** Persist secondary route selection across reloads. */
  onPresentationChange?: (next: {
    operationsView: OperationsView;
    workHubView: WorkHubView;
  }) => void;
  /** Push attention count to the Extension Host status bar. */
  onAttentionCountChange?: (count: number) => void;
};

export function OperationsPanel({
  navigation,
  initialView = "overview",
  initialWorkHubView = "runs",
  onPresentationChange,
  onAttentionCountChange,
}: OperationsPanelProps) {
  const ports = useHostPorts();
  const { capabilities } = useHostPortsContext();
  const canTaskRuns = useCapability("work.taskRuns");
  const canAutomations = useCapability("work.automations");
  const canInbox = useCapability("inbox.notifications");
  const [view, setView] = useState<OperationsView>(initialView);
  const [workHubView, setWorkHubView] =
    useState<WorkHubView>(initialWorkHubView);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createInitialTitle, setCreateInitialTitle] = useState("");

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
    if (navigation.composeTask && canTaskRuns) {
      setCreateOpen(true);
      setCreateError(null);
      setCreateInitialTitle(navigation.draftTitle ?? "");
    }
  }, [navigation, flags, canTaskRuns]);

  useEffect(() => {
    if (!availableViews.includes(view)) {
      setView("overview");
    }
  }, [availableViews, view]);

  useEffect(() => {
    onPresentationChange?.({
      operationsView: view,
      workHubView,
    });
  }, [view, workHubView, onPresentationChange]);

  // Close the create form when leaving task-run capable routes or losing the capability.
  useEffect(() => {
    if (!canTaskRuns || (view !== "work" && view !== "runs")) {
      setCreateOpen(false);
    }
  }, [canTaskRuns, view]);

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

  const navigateOverviewRow = useCallback(
    (destination: {
      view: "overview" | "work" | "runs" | "inbox";
      workHubView?: "runs" | "scheduled";
    }) => {
      setView(resolveDeepLinkOperationsView(destination.view, flags));
      if (destination.workHubView) {
        setWorkHubView(
          resolveDeepLinkWorkHubView(destination.workHubView, flags),
        );
      }
    },
    [flags],
  );

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

  const onRetryTask = useCallback(
    (id: string) => {
      void withBusy(id, () => ports.work.retryTaskRun(id).then(() => undefined));
    },
    [ports.work, withBusy],
  );
  const onStopTask = useCallback(
    (id: string) => {
      void withBusy(id, () => ports.work.cancelTaskRun(id));
    },
    [ports.work, withBusy],
  );
  const onRemoveTask = useCallback(
    (id: string) => {
      void withBusy(id, () => ports.work.removeTaskRun(id));
    },
    [ports.work, withBusy],
  );

  const openCreate = useCallback((title = "") => {
    setCreateInitialTitle(title);
    setCreateError(null);
    setCreateOpen(true);
    if (view !== "work" && view !== "runs") {
      setView(canTaskRuns ? "runs" : "work");
      setWorkHubView("runs");
    }
  }, [view, canTaskRuns]);

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateError(null);
    setCreateInitialTitle("");
  }, []);

  const submitCreate = useCallback(
    async (draft: { title: string; prompt: string }) => {
      setCreateBusy(true);
      setCreateError(null);
      try {
        await ports.work.createTaskRun(draft);
        setCreateOpen(false);
        setCreateInitialTitle("");
        await load();
      } catch (error) {
        setCreateError(
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setCreateBusy(false);
      }
    },
    [ports.work, load],
  );

  const onMarkInboxSeen = useCallback(
    (id: string) => {
      void withBusy(id, () => ports.inbox.markNotificationSeen(id));
    },
    [ports.inbox, withBusy],
  );

  const taskActions = {
    busyId: actionBusyId,
    onRetry: onRetryTask,
    onStop: onStopTask,
    onRemove: onRemoveTask,
    canCreate: canTaskRuns,
    createOpen,
    createBusy,
    createError,
    createInitialTitle,
    onCreateOpen: () => openCreate(""),
    onCreateClose: closeCreate,
    onCreateSubmit: submitCreate,
    onReuse: (title: string) => openCreate(title),
  };

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }
    onAttentionCountChange?.(countOperationsAttention(state.data));
  }, [state, onAttentionCountChange]);

  const viewModel = useMemo(() => {
    const base = buildOperationsOverview(data);
    const attention = withOverviewRowNavigation(
      base.attention,
      flags,
      navigateOverviewRow,
    ).map((row) => {
      const failedId = overviewFailedRunId(row.id, row.statusLabel);
      const inboxId = overviewUnreadInboxId(row.id, row.statusLabel);
      const buttons: ReactNode[] = [];
      if (failedId && canTaskRuns) {
        buttons.push(
          createElement(
            "button",
            {
              key: "retry",
              type: "button",
              className: "altai-ops-row-action",
              disabled: actionBusyId === failedId,
              onClick: () => {
                onRetryTask(failedId);
              },
            },
            actionBusyId === failedId ? "…" : "Retry",
          ),
        );
      }
      if (inboxId && canInbox) {
        buttons.push(
          createElement(
            "button",
            {
              key: "seen",
              type: "button",
              className: "altai-ops-row-action",
              disabled: actionBusyId === inboxId,
              onClick: () => {
                onMarkInboxSeen(inboxId);
              },
            },
            actionBusyId === inboxId ? "…" : "Mark read",
          ),
        );
      }
      if (buttons.length === 0) {
        return row;
      }
      return {
        ...row,
        actions: createElement(Fragment, null, ...buttons),
      };
    });
    const progressing = withOverviewRowNavigation(
      base.progressing,
      flags,
      navigateOverviewRow,
    ).map((row) => {
      const runId = overviewActiveRunId(row.id, row.statusLabel);
      if (!runId || !canTaskRuns) {
        return row;
      }
      const actions: ReactNode = createElement(
        "button",
        {
          type: "button",
          className: "altai-ops-row-action",
          disabled: actionBusyId === runId,
          onClick: () => {
            onStopTask(runId);
          },
        },
        actionBusyId === runId ? "…" : "Cancel",
      );
      return { ...row, actions };
    });
    return {
      metrics: base.metrics,
      attention,
      progressing,
    };
  }, [
    data,
    flags,
    navigateOverviewRow,
    canTaskRuns,
    canInbox,
    actionBusyId,
    onStopTask,
    onRetryTask,
    onMarkInboxSeen,
  ]);

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
