/**
 * Work OS M1 surfaces for VS Code Operations (Work list/detail + Inbox).
 * Backed by the canonical WorkPort and the native host's durable work.db.
 */

import type { EventPort, WorkItem } from "@altai/host-contract";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NewWorkDialog,
  WorkDetail,
  WorkInbox,
  WorkList,
  type WorkDetailPrimaryAction,
  type WorkInboxRow,
  type WorkListFilterId,
  type WorkListRow,
} from "./workOsUi.js";
import {
  loadWorkInboxRows,
  type WorkInboxPort,
} from "./workInboxUi.js";
import {
  executeWorkAction,
  type WorkOsPort,
} from "./workOsActions.js";
import {
  canCommitWorkDetailRequest,
  createCoalescedAsyncGate,
  shouldRequestWorkInboxRefresh,
  WORK_INBOX_POLL_INTERVAL_MS,
} from "./workOsRefresh.js";

function stateLabel(state: string): string {
  return state.split("_").join(" ");
}

function toListRow(item: WorkItem): WorkListRow {
  return {
    id: item.id,
    title: item.title,
    projectLabel: item.projectId,
    stateLabel: stateLabel(item.state),
    attemptLabel: "—",
    updatedLabel: "recent",
  };
}

function primaryActionsFor(state: string): WorkDetailPrimaryAction[] {
  switch (state) {
    case "backlog":
      return ["ready", "start"];
    case "ready":
      return ["start"];
    case "in_progress":
      return ["open_run"];
    case "in_review":
      return ["accept", "return"];
    case "done":
    case "cancelled":
      return ["reopen"];
    default:
      return [];
  }
}

export type WorkOsPanelProps = {
  surface: "work" | "inbox";
  workPort: WorkOsPort;
  inboxPort: WorkInboxPort;
  eventPort: Pick<EventPort, "subscribe">;
  available: boolean;
  inboxAvailable: boolean;
  onOpenInbox: () => void;
  onGoToWork: () => void;
  onInboxCountChange?: (count: number) => void;
};

export function WorkOsPanel({
  surface,
  workPort,
  inboxPort,
  eventPort,
  available,
  inboxAvailable,
  onOpenInbox,
  onGoToWork,
  onInboxCountChange,
}: WorkOsPanelProps) {
  const [filter, setFilter] = useState<WorkListFilterId>("my_active");
  const [rows, setRows] = useState<WorkListRow[]>([]);
  const [listStatus, setListStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [inboxRows, setInboxRows] = useState<WorkInboxRow[]>([]);
  const [inboxStatus, setInboxStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [inboxError, setInboxError] = useState<string | null>(null);
  const inboxGenerationRef = useRef(0);
  const inboxRefreshExecutorRef = useRef<() => Promise<void>>(async () => {});
  const inboxRefreshGateRef = useRef<ReturnType<
    typeof createCoalescedAsyncGate
  > | null>(null);
  if (!inboxRefreshGateRef.current) {
    inboxRefreshGateRef.current = createCoalescedAsyncGate(() =>
      inboxRefreshExecutorRef.current(),
    );
  }
  const previousSurfaceRef = useRef(surface);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const detailGenerationRef = useRef(0);
  const [detail, setDetail] = useState<WorkItem | null>(null);
  const [detailStatus, setDetailStatus] = useState<
    "loading" | "ready" | "error" | "not_found"
  >("ready");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!available) {
      setRows([]);
      setListStatus("error");
      setError(
        "Canonical Work is unavailable. Update or restart the native host.",
      );
      return;
    }
    setListStatus("loading");
    try {
      const items = await workPort.listWork(filter);
      setRows(items.map(toListRow));
      setListStatus("ready");
      setError(null);
    } catch (err) {
      setRows([]);
      setListStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [available, filter, workPort]);

  const loadDetail = useCallback(
    async (workId: string) => {
      const request = {
        generation: ++detailGenerationRef.current,
        workId,
      };
      const canCommit = () =>
        canCommitWorkDetailRequest(
          request,
          detailGenerationRef.current,
          selectedIdRef.current,
        );
      if (!available) {
        if (!canCommit()) return;
        setDetail(null);
        setDetailStatus("error");
        setError(
          "Canonical Work is unavailable. Update or restart the native host.",
        );
        return;
      }
      if (!canCommit()) return;
      setDetailStatus("loading");
      try {
        const item = await workPort.getWork(workId);
        if (!canCommit()) return;
        if (!item) {
          setDetail(null);
          setDetailStatus("not_found");
          return;
        }
        if (item.id !== workId) {
          throw new Error("invalid_work_detail_identity");
        }
        setDetail(item);
        setDetailStatus("ready");
        setError(null);
      } catch (err) {
        if (!canCommit()) return;
        setDetail(null);
        setDetailStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [available, workPort],
  );

  inboxRefreshExecutorRef.current = async () => {
    const generation = ++inboxGenerationRef.current;
    if (!inboxAvailable) {
      setInboxRows([]);
      setInboxStatus("error");
      setInboxError(
        "Canonical Inbox is unavailable. Update or restart the native host.",
      );
      onInboxCountChange?.(0);
      return;
    }
    setInboxStatus("loading");
    try {
      const nextRows = await loadWorkInboxRows(inboxPort);
      if (generation !== inboxGenerationRef.current) return;
      setInboxRows(nextRows);
      setInboxStatus("ready");
      setInboxError(null);
      onInboxCountChange?.(nextRows.length);
    } catch (err) {
      if (generation !== inboxGenerationRef.current) return;
      setInboxRows([]);
      setInboxStatus("error");
      setInboxError(err instanceof Error ? err.message : String(err));
      // The mounted Inbox shows this error, while its badge deliberately keeps
      // the last-known actionable count until a successful refresh.
    }
  };

  const requestInboxRefresh = useCallback((): Promise<void> => {
    return inboxRefreshGateRef.current!.request();
  }, []);

  const clearSelectedWork = useCallback(() => {
    detailGenerationRef.current += 1;
    selectedIdRef.current = null;
    setSelectedId(null);
    setDetail(null);
    setDetailStatus("ready");
    setError(null);
  }, []);

  const openWork = useCallback(
    (workId: string) => {
      selectedIdRef.current = workId;
      setSelectedId(workId);
      setDetail(null);
      setError(null);
      // Deliberately load even when the same Inbox row is selected again.
      void loadDetail(workId);
    },
    [loadDetail],
  );

  const goToWorkList = useCallback(() => {
    clearSelectedWork();
    onGoToWork();
  }, [clearSelectedWork, onGoToWork]);

  useEffect(() => {
    if (surface === "work") void refresh();
  }, [refresh, surface]);

  useEffect(() => {
    inboxGenerationRef.current += 1;
    void requestInboxRefresh();
    return () => {
      inboxGenerationRef.current += 1;
      inboxRefreshGateRef.current?.cancelPending();
    };
  }, [inboxAvailable, inboxPort, onInboxCountChange, requestInboxRefresh]);

  useEffect(() => {
    const previousSurface = previousSurfaceRef.current;
    previousSurfaceRef.current = surface;
    if (
      shouldRequestWorkInboxRefresh("surface", {
        previousSurface,
        surface,
      })
    ) {
      void requestInboxRefresh();
    }
  }, [requestInboxRefresh, surface]);

  useEffect(() => {
    if (!inboxAvailable) return;
    const interval = window.setInterval(() => {
      if (
        shouldRequestWorkInboxRefresh("poll", {
          visibilityState: document.visibilityState,
        })
      ) {
        void requestInboxRefresh();
      }
    }, WORK_INBOX_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [inboxAvailable, requestInboxRefresh]);

  useEffect(() => {
    const onFocus = () => {
      if (shouldRequestWorkInboxRefresh("focus")) {
        void requestInboxRefresh();
      }
    };
    const onVisibility = () => {
      if (
        shouldRequestWorkInboxRefresh("visibility", {
          visibilityState: document.visibilityState,
        })
      ) {
        void requestInboxRefresh();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [requestInboxRefresh]);

  useEffect(
    () =>
      eventPort.subscribe((event) => {
        if (event.type === "lifecycle" || event.type === "notification") {
          void requestInboxRefresh();
        }
      }),
    [eventPort, requestInboxRefresh],
  );

  const runAction = useCallback(
    async (action: WorkDetailPrimaryAction) => {
      if (!detail || !selectedId || detail.id !== selectedId || actionBusy) {
        return;
      }
      const request = {
        generation: detailGenerationRef.current,
        workId: detail.id,
      };
      let returnGuidance: string | undefined;
      if (action === "return") {
        returnGuidance =
          window.prompt("Return guidance (required for the next attempt):") ??
          "";
        if (!returnGuidance.trim()) return;
      }
      setActionBusy(true);
      try {
        const next = await executeWorkAction(
          workPort,
          detail,
          action,
          returnGuidance,
        );
        if (
          next &&
          canCommitWorkDetailRequest(
            request,
            detailGenerationRef.current,
            selectedIdRef.current,
          )
        ) {
          setDetail(next);
          setDetailStatus("ready");
        }
        await refresh();
        await requestInboxRefresh();
      } catch (err) {
        if (
          canCommitWorkDetailRequest(
            request,
            detailGenerationRef.current,
            selectedIdRef.current,
          )
        ) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        setActionBusy(false);
      }
    },
    [
      actionBusy,
      detail,
      refresh,
      requestInboxRefresh,
      selectedId,
      workPort,
    ],
  );

  if (surface === "inbox") {
    return (
      <WorkInbox
        status={inboxStatus}
        rows={inboxRows}
        onOpenWork={(id) => {
          openWork(id);
          onGoToWork();
        }}
        onGoToWork={goToWorkList}
        errorMessage={inboxError ?? undefined}
        onRetry={() => {
          void requestInboxRefresh();
        }}
      />
    );
  }

  if (selectedId) {
    return (
      <>
        {error ? (
          <p className="altai-ops-inline-error" role="status">
            {error}
          </p>
        ) : null}
        <WorkDetail
          status={detailStatus}
          title={detail?.title}
          stateLabel={detail ? stateLabel(detail.state) : undefined}
          projectLabel={detail?.projectId}
          description={detail?.description}
          acceptanceCriteria={detail?.acceptanceCriteria}
          blocker={detail?.blocker}
          primaryActions={
            detail && !actionBusy ? primaryActionsFor(detail.state) : []
          }
          onPrimaryAction={(action) => {
            void runAction(action);
          }}
          onBack={clearSelectedWork}
          onRetry={
            selectedId
              ? () => {
                  void loadDetail(selectedId);
                }
              : undefined
          }
          errorMessage={error ?? undefined}
        />
      </>
    );
  }

  return (
    <>
      {error ? (
        <p className="altai-ops-inline-error" role="status">
          {error}
        </p>
      ) : null}
      <WorkList
        status={listStatus}
        filter={filter}
        onFilterChange={setFilter}
        rows={rows}
        onOpenWork={openWork}
        onNewWork={() => {
          if (available) setNewWorkOpen(true);
        }}
        onOpenInbox={onOpenInbox}
        errorMessage={error ?? undefined}
        onRetry={() => {
          void refresh();
        }}
      />
      <NewWorkDialog
        open={newWorkOpen}
        projectLabel="VS Code"
        onClose={() => setNewWorkOpen(false)}
        onCreate={({ title, description, acceptanceCriteria }) => {
          void (async () => {
            try {
              const created = await workPort.createWork({
                title,
                description,
                acceptanceCriteria,
              });
              setFilter("backlog");
              setNewWorkOpen(false);
              setDetail(created);
              setDetailStatus("ready");
              detailGenerationRef.current += 1;
              selectedIdRef.current = created.id;
              setSelectedId(created.id);
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          })();
        }}
      />
    </>
  );
}
