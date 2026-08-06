/**
 * Capability-gated edit-checkpoint popover (list + restore).
 */

import {
  CheckpointMenuPanel,
  IconBtn,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  canMountCheckpointChrome,
  canRestoreCheckpoint,
  toCheckpointMenuItems,
} from "./checkpointChrome.js";

export type ChatCheckpointsChromeProps = {
  chatId: string | null;
  onRestored?: (checkpointId: string) => void;
  onError?: (message: string) => void;
};

export function ChatCheckpointsChrome({
  chatId,
  onRestored,
  onError,
}: ChatCheckpointsChromeProps) {
  const ports = useHostPorts();
  const canList = useCapability("review.checkpoints");
  const canRestore = useCapability("review.restoreCheckpoint");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [items, setItems] = useState<ReturnType<typeof toCheckpointMenuItems>>(
    [],
  );

  const flags = useMemo(
    () => ({
      canList,
      canRestore,
      hasActiveChat: Boolean(chatId),
    }),
    [canList, canRestore, chatId],
  );

  const refresh = useCallback(async () => {
    if (!chatId || !canList) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await ports.review.listCheckpoints(chatId);
      setItems(toCheckpointMenuItems(rows));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [chatId, canList, ports, onError]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void refresh();
  }, [open, refresh]);

  if (!canMountCheckpointChrome(flags)) {
    return null;
  }

  return (
    <div className="altai-checkpoint-chrome">
      <IconBtn
        title="Edit checkpoints (undo agent edits)"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        disabled={loading && !open}
      >
        ↺
      </IconBtn>
      {open ? (
        <div
          className="altai-checkpoint-popover"
          role="dialog"
          aria-label="Edit checkpoints"
        >
          <CheckpointMenuPanel
            items={items}
            restoringId={restoringId}
            onRestore={(id) => {
              if (!canRestoreCheckpoint(flags, restoringId)) {
                return;
              }
              setRestoringId(id);
              void ports.review
                .restoreCheckpoint(id)
                .then(async () => {
                  onRestored?.(id);
                  await refresh();
                })
                .catch((err: unknown) => {
                  onError?.(
                    err instanceof Error ? err.message : String(err),
                  );
                })
                .finally(() => {
                  setRestoringId(null);
                });
            }}
          />
          <div className="altai-checkpoint-popover-footer">
            <button
              type="button"
              className="altai-checkpoint-close"
              onClick={() => {
                setOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
