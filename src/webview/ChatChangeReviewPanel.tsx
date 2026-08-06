/**
 * Open/dismiss change-review centre for edit_diff rows.
 * Apply is intentionally omitted (requires review.editProposal on the host).
 */

import {
  AuxiliarySurface,
  UnifiedDiffPreview,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useMemo, useState } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import {
  dismissAllChangeReviewIds,
  dismissChangeReviewId,
  listChangeReviewItems,
  planLineDiffStats,
  type ChangeReviewItem,
} from "./changeReviewPanelChrome.js";

export type ChatChangeReviewPanelProps = {
  open: boolean;
  messages: readonly ChatDisplayMessage[];
  onClose: () => void;
  onOpenFileError?: (message: string) => void;
};

export function ChatChangeReviewPanel({
  open,
  messages,
  onClose,
  onOpenFileError,
}: ChatChangeReviewPanelProps) {
  const ports = useHostPorts();
  const canOpenDiff = useCapability("workspace.openDiff");
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queue = useMemo(
    () => listChangeReviewItems(messages, dismissed),
    [messages, dismissed],
  );

  if (!open) {
    return null;
  }

  const openDiff = async (item: ChangeReviewItem): Promise<void> => {
    if (!canOpenDiff) {
      onOpenFileError?.("Diff open is unavailable on this host");
      return;
    }
    setBusyId(item.id);
    try {
      await ports.workspace.openDiff({
        title: `ALTAI · ${item.path}`,
        originalText: item.originalContent,
        modifiedText: item.proposedContent,
        path: item.path,
      });
    } catch (err) {
      onOpenFileError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="altai-change-review-panel">
      <AuxiliarySurface
        title="Change review"
        subtitle={
          queue.length
            ? `${queue.length} pending change${queue.length === 1 ? "" : "s"}`
            : "No changes to review"
        }
        onClose={onClose}
        actions={
          queue.length > 0 ? (
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDismissed(dismissAllChangeReviewIds(queue));
              }}
            >
              Dismiss all
            </button>
          ) : undefined
        }
        presentation="embedded"
      >
        <div className="flex flex-col gap-2 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Review diffs in the editor. Applying edits on disk requires a future
            host <code className="font-mono">review.editProposal</code>{" "}
            capability.
          </p>
          {queue.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-[11px] text-muted-foreground">
              No pending edit diffs. New agent edits will show here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {queue.map((item) => {
                const stats = planLineDiffStats(
                  item.originalContent,
                  item.proposedContent,
                );
                const busy = busyId === item.id;
                const expanded = expandedId === item.id;
                return (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-md border border-border bg-muted/30"
                  >
                    <div className="flex items-start gap-2 px-2.5 py-1.5">
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-[10px] text-muted-foreground"
                        aria-expanded={expanded}
                        onClick={() => {
                          setExpandedId((prev) =>
                            prev === item.id ? null : item.id,
                          );
                        }}
                      >
                        {expanded ? "▾" : "▸"}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-[11.5px] text-foreground">
                          {item.path}
                          {item.isNewFile ? (
                            <span className="ml-1 text-[10px] text-success">
                              new
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex gap-2 text-[10px] tabular-nums">
                          <span className="text-success">+{stats.added}</span>
                          <span className="text-destructive">
                            −{stats.removed}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {canOpenDiff ? (
                          <button
                            type="button"
                            className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-foreground hover:bg-accent disabled:opacity-50"
                            disabled={busy}
                            onClick={() => {
                              void openDiff(item);
                            }}
                          >
                            Diff
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => {
                            setDismissed((prev) =>
                              dismissChangeReviewId(prev, item.id),
                            );
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    {expanded ? (
                      <div className="border-t border-border/40 bg-muted/20 px-2.5 py-2">
                        <UnifiedDiffPreview
                          original={item.originalContent}
                          proposed={item.proposedContent}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AuxiliarySurface>
    </div>
  );
}
