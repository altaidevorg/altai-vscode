/**
 * Work OS M1 surfaces for VS Code Operations (Work list/detail + Inbox).
 * Backed by the canonical WorkPort and the native host's durable work.db.
 */

import type {
  AgentRuntimePort,
  EventPort,
  WorkAttempt,
  WorkItem,
  WorkStartRunResult,
} from "@altai/host-contract";
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
import { ExactRunInspectorChrome } from "./ExactRunInspectorChrome.js";
import {
  canCommitExactRunReplay,
  replayExactRun,
  type ExactRunSnapshot,
} from "./exactRunReplay.js";
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
import {
  latestBoundAttempt,
  primaryWorkActions,
} from "./workAttemptUi.js";

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

export type WorkOsPanelProps = {
  surface: "work" | "inbox";
  workPort: WorkOsPort;
  inboxPort: WorkInboxPort;
  eventPort: Pick<EventPort, "subscribe">;
  runtimePort: Pick<AgentRuntimePort, "replayRun">;
  available: boolean;
  attemptRunsAvailable: boolean;
  replayAvailable: boolean;
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
  runtimePort,
  available,
  attemptRunsAvailable,
  replayAvailable,
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
  const [attempts, setAttempts] = useState<WorkAttempt[]>([]);
  const [detailStatus, setDetailStatus] = useState<
    "loading" | "ready" | "error" | "not_found"
  >("ready");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [inspectedRun, setInspectedRun] = useState<{
    chatId: string;
    runId: string;
    snapshot: ExactRunSnapshot | null;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const inspectedRunRef = useRef(inspectedRun);
  inspectedRunRef.current = inspectedRun;
  const inspectorGenerationRef = useRef(0);
  const inspectorRefreshBusyRef = useRef<number | null>(null);

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
    async (workId: string, background = false) => {
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
        setAttempts([]);
        setDetailStatus("error");
        setError(
          "Canonical Work is unavailable. Update or restart the native host.",
        );
        return;
      }
      if (!canCommit()) return;
      if (!background) setDetailStatus("loading");
      try {
        const [item, nextAttempts] = await Promise.all([
          workPort.getWork(workId),
          attemptRunsAvailable
            ? workPort.listWorkAttempts(workId)
            : Promise.resolve([]),
        ]);
        if (!canCommit()) return;
        if (!item) {
          setDetail(null);
          setAttempts([]);
          setDetailStatus("not_found");
          return;
        }
        if (item.id !== workId) {
          throw new Error("invalid_work_detail_identity");
        }
        setDetail(item);
        setAttempts(nextAttempts);
        setDetailStatus("ready");
        setError(null);
      } catch (err) {
        if (!canCommit()) return;
        if (!background) {
          setDetail(null);
          setAttempts([]);
          setDetailStatus("error");
        }
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [attemptRunsAvailable, available, workPort],
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

  const refreshInspectedRun = useCallback(async () => {
    const current = inspectedRunRef.current;
    if (!current) return;
    const generation = inspectorGenerationRef.current;
    if (inspectorRefreshBusyRef.current === generation) return;
    const request = {
      generation,
      chatId: current.chatId,
      runId: current.runId,
    };
    inspectorRefreshBusyRef.current = generation;
    try {
      const snapshot = await replayExactRun(
        runtimePort.replayRun.bind(runtimePort),
        current.chatId,
        current.runId,
        current.snapshot,
      );
      if (!canCommitExactRunReplay(
        request,
        inspectorGenerationRef.current,
        inspectedRunRef.current,
      )) {
        return;
      }
      const next = { ...current, snapshot, loading: false, error: null };
      inspectedRunRef.current = next;
      setInspectedRun(next);
    } catch (err) {
      if (!canCommitExactRunReplay(
        request,
        inspectorGenerationRef.current,
        inspectedRunRef.current,
      )) return;
      const next = {
        ...current,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      };
      inspectedRunRef.current = next;
      setInspectedRun(next);
    } finally {
      if (inspectorRefreshBusyRef.current === generation) {
        inspectorRefreshBusyRef.current = null;
      }
    }
  }, [runtimePort]);

  const openAttemptRun = useCallback(
    (attempt: WorkAttempt) => {
      if (
        !attemptRunsAvailable ||
        !replayAvailable ||
        !attempt.chatId ||
        !attempt.runId
      ) return;
      inspectorGenerationRef.current += 1;
      const next = {
        chatId: attempt.chatId,
        runId: attempt.runId,
        snapshot: null,
        loading: true,
        error: null,
      };
      inspectedRunRef.current = next;
      setInspectedRun(next);
      setError(null);
      void refreshInspectedRun();
    },
    [attemptRunsAvailable, refreshInspectedRun, replayAvailable],
  );

  const closeAttemptRun = useCallback(() => {
    inspectorGenerationRef.current += 1;
    inspectedRunRef.current = null;
    setInspectedRun(null);
  }, []);

  const clearSelectedWork = useCallback(() => {
    detailGenerationRef.current += 1;
    inspectorGenerationRef.current += 1;
    inspectedRunRef.current = null;
    setInspectedRun(null);
    selectedIdRef.current = null;
    setSelectedId(null);
    setDetail(null);
    setAttempts([]);
    setDetailStatus("ready");
    setError(null);
  }, []);

  const openWork = useCallback(
    (workId: string) => {
      inspectorGenerationRef.current += 1;
      inspectedRunRef.current = null;
      setInspectedRun(null);
      selectedIdRef.current = workId;
      setSelectedId(workId);
      setDetail(null);
      setAttempts([]);
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
    if (!attemptRunsAvailable) setAttempts([]);
  }, [attemptRunsAvailable]);

  useEffect(() => {
    if (
      (!attemptRunsAvailable || !replayAvailable) &&
      inspectedRunRef.current
    ) closeAttemptRun();
  }, [attemptRunsAvailable, closeAttemptRun, replayAvailable]);

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

  useEffect(() => {
    if (!selectedId || !attemptRunsAvailable) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadDetail(selectedId, true);
    }, WORK_INBOX_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [attemptRunsAvailable, loadDetail, selectedId]);

  useEffect(() => {
    if (!inspectedRun || inspectedRun.snapshot?.terminal) return;
    const timer = window.setInterval(() => {
      void refreshInspectedRun();
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [inspectedRun, refreshInspectedRun]);

  useEffect(() => () => {
    inspectorGenerationRef.current += 1;
  }, []);

  useEffect(
    () =>
      eventPort.subscribe((event) => {
        if (event.type === "lifecycle" || event.type === "notification") {
          void requestInboxRefresh();
        }
        if (event.type === "lifecycle" && selectedIdRef.current) {
          void loadDetail(selectedIdRef.current, true);
          void refresh();
          if (
            inspectedRunRef.current?.chatId === event.chatId &&
            inspectedRunRef.current?.runId === event.runId
          ) {
            void refreshInspectedRun();
          }
        }
      }),
    [
      eventPort,
      loadDetail,
      refresh,
      refreshInspectedRun,
      requestInboxRefresh,
    ],
  );

  const runAction = useCallback(
    async (action: WorkDetailPrimaryAction) => {
      if (!detail || !selectedId || detail.id !== selectedId || actionBusy) {
        return;
      }
      if (action === "open_run") {
        const attempt = latestBoundAttempt(attempts);
        if (!attempt || !replayAvailable) {
          setError("This Attempt has no replayable bound run.");
          return;
        }
        openAttemptRun(attempt);
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
        const result = await executeWorkAction(
          workPort,
          detail,
          action,
          returnGuidance,
        );
        const startResult =
          result && "work" in result
            ? (result as WorkStartRunResult)
            : null;
        const next: WorkItem | null = startResult
          ? startResult.work
          : (result as WorkItem | null);
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
          if (startResult) {
            setAttempts((current) => [
              startResult.attempt,
              ...current.filter(
                (attempt) => attempt.id !== startResult.attempt.id,
              ),
            ]);
          }
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
        if (selectedIdRef.current === request.workId) {
          // A lost work/start-run response is ambiguous: the host may already
          // have committed and dispatched the Attempt. Re-read Work + history
          // before exposing Start again; a failed foreground recovery leaves
          // the detail fail-closed behind its Retry state.
          await loadDetail(request.workId, action !== "start");
        }
        setActionBusy(false);
      }
    },
    [
      actionBusy,
      attempts,
      detail,
      loadDetail,
      openAttemptRun,
      replayAvailable,
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
      <div className="relative h-full min-h-0 overflow-hidden">
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
          attempts={attempts.map((attempt) => ({
            id: attempt.id,
            label: `#${attempt.number} ${attempt.role}`,
            phaseLabel: stateLabel(attempt.phase),
            ...(attemptRunsAvailable &&
            replayAvailable &&
            attempt.chatId &&
            attempt.runId
              ? { onOpenRun: () => openAttemptRun(attempt) }
              : {}),
          }))}
          primaryActions={
            detail && !actionBusy
              ? primaryWorkActions(detail.state, attempts, {
                  attemptRunsAvailable,
                  replayAvailable,
                })
              : []
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
        {inspectedRun ? (
          <div className="absolute inset-0 z-20 bg-card">
            <ExactRunInspectorChrome
              chatId={inspectedRun.chatId}
              runId={inspectedRun.runId}
              snapshot={inspectedRun.snapshot}
              loading={inspectedRun.loading}
              error={inspectedRun.error}
              onClose={closeAttemptRun}
              onRetry={() => {
                const current = inspectedRunRef.current;
                if (!current) return;
                const next = { ...current, loading: true, error: null };
                inspectedRunRef.current = next;
                setInspectedRun(next);
                void refreshInspectedRun();
              }}
            />
          </div>
        ) : null}
      </div>
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
              setAttempts([]);
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
