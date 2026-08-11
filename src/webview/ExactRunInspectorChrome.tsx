import {
  AiRunInspectorFrame,
  RunDetailsHeader,
  RunOverviewCard,
  SurfaceInlineError,
  SurfaceLoadingState,
} from "@altai/agent-ui";
import { ChatMessageList } from "./ChatMessageList.js";
import { ChatRunInspectorSections } from "./ChatRunInspectorSections.js";
import { countPendingEditDiffs } from "./chatRunChrome.js";
import type { ExactRunSnapshot } from "./exactRunReplay.js";
import { countToolMessages } from "./runDetailsChrome.js";

export type ExactRunInspectorChromeProps = {
  chatId: string;
  runId: string;
  snapshot: ExactRunSnapshot | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
};

/** Read-only inspector for one persisted Attempt run. */
export function ExactRunInspectorChrome({
  chatId,
  runId,
  snapshot,
  loading,
  error,
  onClose,
  onRetry,
}: ExactRunInspectorChromeProps) {
  const messages = snapshot?.messages ?? [];
  const status = error
    ? "blocked"
    : snapshot?.terminal
      ? "idle"
      : "running";
  const statusLabel = loading
    ? "Loading"
    : error
      ? "Unavailable"
      : snapshot?.terminalLabel ?? "Running";

  return (
    <AiRunInspectorFrame
      className="h-full min-h-0 bg-card"
      aria-label="Attempt run inspector"
      header={
        <RunDetailsHeader
          subtitle={`Persisted run · ${runId}`}
          status={status}
          onClose={onClose}
        />
      }
      summary={
        <RunOverviewCard
          statusPill={
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {statusLabel}
            </span>
          }
          tokenLabel={snapshot ? `Event ${snapshot.lastSeq}` : "No events"}
          step={null}
          metrics={[
            {
              label: "Tools",
              value: String(countToolMessages(messages)),
            },
            {
              label: "Changes",
              value: String(countPendingEditDiffs(messages)),
            },
            { label: "Approvals", value: "0" },
            { label: "Chat", value: chatId },
          ]}
        />
      }
    >
      {loading && !snapshot ? (
        <SurfaceLoadingState>Loading the exact persisted run…</SurfaceLoadingState>
      ) : null}
      {error ? (
        <SurfaceInlineError
          className="m-2.5"
          message={error}
          onDismiss={onRetry}
          dismissLabel="Retry"
          dismissAriaLabel="Retry loading persisted run"
        />
      ) : null}
      {snapshot ? (
        <>
          <ChatMessageList
            messages={snapshot.messages}
            canEditUserMessages={false}
            canRetry={false}
            announce="off"
          />
          <ChatRunInspectorSections
            messages={snapshot.messages}
            approvals={[]}
            onApprovalsChange={() => {}}
          />
        </>
      ) : null}
    </AiRunInspectorFrame>
  );
}
