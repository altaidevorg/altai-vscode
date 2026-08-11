/**
 * Work OS M1 surfaces for VS Code Operations (Work list/detail + Inbox).
 * Backed by in-memory workOsStore until host work_* IPC is available.
 */

import {
  NewWorkDialog,
  WorkDetail,
  WorkInbox,
  WorkList,
  type WorkDetailPrimaryAction,
  type WorkInboxRow,
  type WorkListFilterId,
  type WorkListRow,
} from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import {
  createWork,
  getWork,
  listWork,
  readyForReview,
  reviewWork,
  startWork,
  transitionWork,
  type WorkItemDto,
  type WorkListFilter,
} from "./workOsStore.js";

function stateLabel(state: string): string {
  return state.split("_").join(" ");
}

function toListRow(item: WorkItemDto): WorkListRow {
  return {
    id: item.id,
    title: item.title,
    projectLabel: "VS Code",
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

function toStoreFilter(filter: WorkListFilterId): WorkListFilter {
  switch (filter) {
    case "my_active":
      return "my_active";
    case "review":
      return "review";
    case "backlog":
      return "backlog";
    case "done":
      return "done";
  }
}

export type WorkOsPanelProps = {
  surface: "work" | "inbox";
  onOpenInbox: () => void;
  onGoToWork: () => void;
};

export function WorkOsPanel({
  surface,
  onOpenInbox,
  onGoToWork,
}: WorkOsPanelProps) {
  const [filter, setFilter] = useState<WorkListFilterId>("my_active");
  const [rows, setRows] = useState<WorkListRow[]>([]);
  const [inboxRows] = useState<WorkInboxRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkItemDto | null>(null);
  const [detailStatus, setDetailStatus] = useState<
    "loading" | "ready" | "error" | "not_found"
  >("ready");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const refresh = useCallback(() => {
    setRows(listWork(toStoreFilter(filter)).map(toListRow));
    setError(null);
  }, [filter]);

  const loadDetail = useCallback((workId: string) => {
    setDetailStatus("loading");
    const item = getWork(workId);
    if (!item) {
      setDetail(null);
      setDetailStatus("not_found");
      return;
    }
    setDetail(item);
    setDetailStatus("ready");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (surface === "inbox") {
      setSelectedId(null);
    }
  }, [surface]);

  const runAction = useCallback(
    (action: WorkDetailPrimaryAction) => {
      if (!detail || actionBusy) return;
      setActionBusy(true);
      try {
        let next: WorkItemDto | null = null;
        if (action === "ready" || action === "reopen") {
          next = transitionWork(detail.id, detail.revision, "ready");
        } else if (action === "start") {
          next = startWork(detail.id, detail.revision);
        } else if (action === "open_run") {
          next = readyForReview(detail.id, detail.revision);
        } else if (action === "accept") {
          next = reviewWork(detail.id, detail.revision, true);
        } else if (action === "return") {
          const guidance =
            window.prompt("Return guidance (required for the next attempt):") ??
            "";
          if (!guidance.trim()) {
            setActionBusy(false);
            return;
          }
          next = reviewWork(detail.id, detail.revision, false);
        }
        if (next) {
          setDetail(next);
          setDetailStatus("ready");
        }
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, detail, refresh],
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
          projectLabel="VS Code"
          description={detail?.description}
          acceptanceCriteria={detail?.acceptanceCriteria}
          blocker={detail?.blocker}
          primaryActions={
            detail && !actionBusy ? primaryActionsFor(detail.state) : []
          }
          onPrimaryAction={runAction}
          onBack={() => setSelectedId(null)}
          onRetry={
            selectedId
              ? () => {
                  loadDetail(selectedId);
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
        status="ready"
        filter={filter}
        onFilterChange={setFilter}
        rows={rows}
        onOpenWork={(id) => setSelectedId(id)}
        onNewWork={() => setNewWorkOpen(true)}
        onOpenInbox={onOpenInbox}
      />
      <NewWorkDialog
        open={newWorkOpen}
        projectLabel="VS Code"
        onClose={() => setNewWorkOpen(false)}
        onCreate={({ title, description, acceptanceCriteria }) => {
          try {
            const created = createWork({
              title,
              description,
              acceptanceCriteria,
            });
            setFilter("backlog");
            setNewWorkOpen(false);
            refresh();
            setSelectedId(created.id);
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </>
  );
}
