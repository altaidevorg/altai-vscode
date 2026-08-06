/**
 * Domain bodies for Operations Work / Runs / Inbox.
 * Presentational wiring only: shared cards + host ports for transport.
 */

import {
  AutomationCard,
  SurfaceEmptyState,
  SurfaceInlineError,
  SurfaceListGroup,
  SurfaceLoadingState,
  TaskRunCard,
  WorkHubNavigation,
  type WorkHubView,
  NotificationInboxPanel,
  type NotificationInboxFilter,
  type NotificationInboxNotificationRow,
} from "@altai/agent-ui";
import type {
  AutomationInfo,
  NotificationInfo,
  TaskRunInfo,
} from "@altai/host-contract";
import { useEffect, useMemo, useState } from "react";
import type { AutomationDraft } from "./automationDraft.js";
import { OperationsCreateAutomationForm } from "./OperationsCreateAutomationForm.js";
import { OperationsCreateTaskForm } from "./OperationsCreateTaskForm.js";
import {
  automationScheduleUiLabel,
  mapTaskRunUiStatus,
  notificationCreatedAtMs,
  taskRunCreatedAtMs,
  taskRunIsActive,
} from "./operationsRoutes.js";

type TaskRunActions = {
  onRetry: (id: string) => void;
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
  busyId?: string | null;
  canCreate?: boolean;
  createOpen?: boolean;
  createBusy?: boolean;
  createError?: string | null;
  createInitialTitle?: string;
  onCreateOpen?: () => void;
  onCreateClose?: () => void;
  onCreateSubmit?: (draft: {
    title: string;
    prompt: string;
  }) => void | Promise<void>;
  onReuse?: (title: string) => void;
};

type AutomationActions = {
  onTrigger: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
  busyId?: string | null;
  canCreate?: boolean;
  createOpen?: boolean;
  createBusy?: boolean;
  createError?: string | null;
  createInitialTitle?: string;
  onCreateOpen?: () => void;
  onCreateClose?: () => void;
  onCreateSubmit?: (draft: AutomationDraft) => void | Promise<void>;
};

type InboxActions = {
  onMarkSeen: (id: string) => void;
  onResolve: (id: string) => void;
  onRefresh: () => void;
  onMarkAllRead?: () => void;
  busyId?: string | null;
  markingAllRead?: boolean;
  error?: string | null;
  loading?: boolean;
};

export function OperationsWorkDomain({
  taskRuns,
  automations,
  canTaskRuns,
  canAutomations,
  actions,
  automationActions,
  hubView: hubViewProp,
  onHubViewChange,
}: {
  taskRuns: TaskRunInfo[];
  automations: AutomationInfo[];
  canTaskRuns: boolean;
  canAutomations: boolean;
  actions: TaskRunActions;
  automationActions: AutomationActions;
  /** Optional deep-link selection for the Work hub strip. */
  hubView?: WorkHubView;
  /** Persist hub selection when the user toggles Runs/Scheduled. */
  onHubViewChange?: (view: WorkHubView) => void;
}) {
  const defaultView: WorkHubView =
    hubViewProp ?? (canTaskRuns ? "runs" : "scheduled");
  const [hubView, setHubView] = useState<WorkHubView>(defaultView);

  useEffect(() => {
    if (hubViewProp) {
      setHubView(hubViewProp);
    }
  }, [hubViewProp]);

  const showNav = canTaskRuns && canAutomations;
  const active =
    !showNav
      ? canTaskRuns
        ? "runs"
        : "scheduled"
      : hubView;

  return (
    <div className="altai-ops-domain">
      {showNav ? (
        <WorkHubNavigation
          view={hubView}
          onViewChange={(next) => {
            setHubView(next);
            onHubViewChange?.(next);
          }}
        />
      ) : null}
      {active === "runs" ? (
        <TaskRunsList taskRuns={taskRuns} actions={actions} title="Runs" />
      ) : (
        <AutomationsList
          automations={automations}
          actions={automationActions}
        />
      )}
    </div>
  );
}

export function OperationsRunsDomain({
  taskRuns,
  actions,
}: {
  taskRuns: TaskRunInfo[];
  actions: TaskRunActions;
}) {
  return (
    <div className="altai-ops-domain">
      <TaskRunsList
        taskRuns={taskRuns}
        actions={actions}
        title="Background executions"
      />
    </div>
  );
}

export function OperationsInboxDomain({
  notifications,
  actions,
}: {
  notifications: NotificationInfo[];
  actions: InboxActions;
}) {
  const [filter, setFilter] = useState<NotificationInboxFilter>("all");
  const [query, setQuery] = useState("");

  const mapped = useMemo(
    () => notifications.map(toInboxNotificationRow),
    [notifications],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mapped.filter((row) => {
      if (!q) return true;
      const hay = `${row.notification.title} ${row.notification.body ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [mapped, query]);

  const unread = filtered.filter((row) => row.notification.seenAtMs === null);
  const read = filtered.filter((row) => row.notification.seenAtMs !== null);
  const attention = unread.length;
  const filterCounts: Record<NotificationInboxFilter, number> = {
    all: filtered.length,
    attention,
    updates: filtered.length,
  };

  return (
    <div className="altai-ops-domain altai-ops-domain--inbox">
      <NotificationInboxPanel
        attentionCount={attention}
        filter={filter}
        onFilterChange={setFilter}
        filterCounts={filterCounts}
        query={query}
        onQueryChange={setQuery}
        error={actions.error ?? null}
        loading={actions.loading ?? false}
        hydrated
        empty={notifications.length === 0}
        hasVisibleItems={filtered.length > 0}
        unreadCount={unread.length}
        markingAllRead={actions.markingAllRead ?? false}
        onMarkAllRead={actions.onMarkAllRead}
        onRefresh={actions.onRefresh}
        onRetry={actions.onRefresh}
        unreadNotifications={filter === "updates" ? [] : unread}
        readNotifications={filter === "attention" ? [] : read}
        allNotifications={filtered}
        onMarkNotificationSeen={actions.onMarkSeen}
        onResolveNotification={actions.onResolve}
        onOpenNotificationChat={() => {
          /* Chat deep-link lands with a later V-slice. */
        }}
      />
    </div>
  );
}

function TaskRunsList({
  taskRuns,
  actions,
  title,
}: {
  taskRuns: TaskRunInfo[];
  actions: TaskRunActions;
  title: string;
}) {
  const createBar =
    actions.canCreate &&
    actions.onCreateOpen &&
    actions.onCreateClose &&
    actions.onCreateSubmit ? (
      <OperationsCreateTaskForm
        open={Boolean(actions.createOpen)}
        busy={actions.createBusy}
        error={actions.createError}
        initialTitle={actions.createInitialTitle ?? ""}
        onOpen={actions.onCreateOpen}
        onClose={actions.onCreateClose}
        onSubmit={actions.onCreateSubmit}
      />
    ) : null;

  if (taskRuns.length === 0) {
    return (
      <div className="altai-ops-domain-body">
        {createBar}
        <SurfaceEmptyState
          title="No task runs"
          description="Create a background task to run agent work without taking over chat."
        />
      </div>
    );
  }

  return (
    <div className="altai-ops-domain-body">
      {createBar}
      <SurfaceListGroup title={title} count={taskRuns.length}>
        {taskRuns.map((run) => {
          const active = taskRunIsActive(run.status);
          const uiStatus = mapTaskRunUiStatus(run.status);
          const busy = actions.busyId === run.id;
          return (
            <TaskRunCard
              key={run.id}
              title={run.title}
              status={uiStatus}
              createdAtMs={taskRunCreatedAtMs(run)}
              active={active}
              busyRetry={busy}
              onOpen={() => {
                /* Session focus is a later chat/host bridge. */
              }}
              onReuse={() => {
                actions.onReuse?.(run.title);
              }}
              onRetry={
                run.status === "failed" || run.status === "cancelled"
                  ? () => actions.onRetry(run.id)
                  : undefined
              }
              onStop={active ? () => actions.onStop(run.id) : undefined}
              onRemove={
                !active ? () => actions.onRemove(run.id) : undefined
              }
            />
          );
        })}
      </SurfaceListGroup>
    </div>
  );
}

function AutomationsList({
  automations,
  actions,
}: {
  automations: AutomationInfo[];
  actions: AutomationActions;
}) {
  const createBar =
    actions.canCreate &&
    actions.onCreateOpen &&
    actions.onCreateClose &&
    actions.onCreateSubmit ? (
      <OperationsCreateAutomationForm
        open={Boolean(actions.createOpen)}
        busy={actions.createBusy}
        error={actions.createError}
        initialTitle={actions.createInitialTitle ?? ""}
        onOpen={actions.onCreateOpen}
        onClose={actions.onCreateClose}
        onSubmit={actions.onCreateSubmit}
      />
    ) : null;

  if (automations.length === 0) {
    return (
      <div className="altai-ops-domain-body">
        {createBar}
        <SurfaceEmptyState
          title="No scheduled work"
          description="Automations and recurring agent jobs will appear here."
        />
      </div>
    );
  }

  return (
    <div className="altai-ops-domain-body">
      {createBar}
      <SurfaceListGroup title="Scheduled" count={automations.length}>
        {automations.map((item) => (
          <AutomationCard
            key={item.id}
            message={item.title}
            scheduleLabel={automationScheduleUiLabel(item)}
            nextRunLabel={item.enabled ? "Enabled" : "Paused"}
            lastRunLabel={item.enabled ? "Enabled" : "Paused"}
            owningChatLabel="Automation"
            jobState={item.enabled ? "enabled" : "paused"}
            pendingRemove={actions.busyId === item.id}
            onOpenChat={() => actions.onTrigger(item.id)}
            onDuplicate={() => actions.onTrigger(item.id)}
            onRemove={() => {
              if (item.enabled) {
                actions.onPause(item.id);
              } else {
                actions.onDelete(item.id);
              }
            }}
          />
        ))}
      </SurfaceListGroup>
    </div>
  );
}

function toInboxNotificationRow(
  item: NotificationInfo,
): NotificationInboxNotificationRow {
  return {
    id: item.id,
    busy: false,
    canOpenChat: Boolean(item.chatId),
    notification: {
      title: item.title,
      body: item.body ?? null,
      kind: "notification",
      createdAtMs: notificationCreatedAtMs(item),
      seenAtMs: item.seen ? notificationCreatedAtMs(item) : null,
    },
  };
}

/** Shared loading/error body for non-overview routes. */
export function OperationsDomainStatus({
  status,
  errorMessage,
  onRetry,
}: {
  status: "loading" | "error" | "ready";
  errorMessage?: string;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return <SurfaceLoadingState>Loading…</SurfaceLoadingState>;
  }
  if (status === "error") {
    return (
      <div className="altai-ops-domain-body">
        <SurfaceInlineError
          message={errorMessage ?? "Failed to load"}
          onDismiss={onRetry}
        />
      </div>
    );
  }
  return null;
}
