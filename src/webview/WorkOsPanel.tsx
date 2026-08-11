/**
 * Work OS M1 surfaces for VS Code Operations (Work list/detail + Inbox).
 * Backed by the canonical WorkPort and the native host's durable work.db.
 */

import type { WorkItem } from "@altai/host-contract";
import { useCallback, useEffect, useState } from "react";
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
  executeWorkAction,
  type WorkOsPort,
} from "./workOsActions.js";

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
  available: boolean;
  onOpenInbox: () => void;
  onGoToWork: () => void;
};

export function WorkOsPanel({
  surface,
  workPort,
  available,
  onOpenInbox,
  onGoToWork,
}: WorkOsPanelProps) {
  const [filter, setFilter] = useState<WorkListFilterId>("my_active");
  const [rows, setRows] = useState<WorkListRow[]>([]);
  const [listStatus, setListStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [inboxRows] = useState<WorkInboxRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      if (!available) {
        setDetail(null);
        setDetailStatus("error");
        setError(
          "Canonical Work is unavailable. Update or restart the native host.",
        );
        return;
      }
      setDetailStatus("loading");
      try {
        const item = await workPort.getWork(workId);
        if (!item) {
          setDetail(null);
          setDetailStatus("not_found");
          return;
        }
        setDetail(item);
        setDetailStatus("ready");
        setError(null);
      } catch (err) {
        setDetail(null);
        setDetailStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [available, workPort],
  );

  useEffect(() => {
    if (surface === "work") void refresh();
  }, [refresh, surface]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (surface === "inbox") setSelectedId(null);
  }, [surface]);

  const runAction = useCallback(
    async (action: WorkDetailPrimaryAction) => {
      if (!detail || actionBusy) return;
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
        if (next) {
          setDetail(next);
          setDetailStatus("ready");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, detail, refresh, workPort],
  );

  if (surface === "inbox") {
    return (
      <WorkInbox
        status="ready"
        rows={inboxRows}
        onOpenWork={(id) => {
          onGoToWork();
          setSelectedId(id);
        }}
        onGoToWork={onGoToWork}
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
          onBack={() => setSelectedId(null)}
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
        onOpenWork={(id) => setSelectedId(id)}
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
