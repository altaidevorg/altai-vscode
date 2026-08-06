/**
 * Capability-gated Chat session history using shared ChatHistoryPanel.
 */

import {
  ChatHistoryPanel,
  groupSessionsByRecency,
  useCapability,
  useHostPorts,
  type SessionHistoryItem,
} from "@altai/agent-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sessionsToHistoryItems } from "./sessionHistoryMap.js";
import {
  resolveSessionRemoveMode,
  sessionRemoveErrorMessage,
} from "./sessionMutateChrome.js";
import { filterSessionsBySearch } from "./sessionSearch.js";

export type ChatSessionListProps = {
  activeChatId: string | null;
  onFocusSession: (input: { chatId?: string; label?: string }) => void;
  /** Bump to force list reload (e.g. after startRun). */
  refreshKey?: number;
};

export { filterSessionsBySearch } from "./sessionSearch.js";

export function ChatSessionList({
  activeChatId,
  onFocusSession,
  refreshKey = 0,
}: ChatSessionListProps) {
  const ports = useHostPorts();
  const canList = useCapability("sessions.list");
  const canCreate = useCapability("sessions.create");
  const canRename = useCapability("sessions.rename");
  const canArchive = useCapability("sessions.archive");
  const canDelete = useCapability("sessions.delete");
  const removeMode = resolveSessionRemoveMode({ canArchive, canDelete });
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!canList) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sessions = await ports.sessions.listSessions();
      setItems(sessionsToHistoryItems(sessions));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [ports, canList]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const filtered = useMemo(
    () => filterSessionsBySearch(items, search),
    [items, search],
  );

  const groups = useMemo(
    () => groupSessionsByRecency(filtered),
    [filtered],
  );

  if (!canList) {
    return null;
  }

  return (
    <aside className="altai-chat-history-rail" aria-label="Chat sessions">
      {error ? (
        <p className="altai-chat-error" role="alert" style={{ padding: "0.5rem" }}>
          {error}
        </p>
      ) : null}
      {loading && items.length === 0 ? (
        <p className="altai-shell-meta" style={{ padding: "0.75rem" }}>
          Loading sessions…
        </p>
      ) : (
        <ChatHistoryPanel
          groups={groups}
          activeId={activeChatId}
          search={search}
          onSearchChange={setSearch}
          onNewChat={() => {
            if (!canCreate) {
              setError("Create session is unavailable on this host.");
              return;
            }
            void (async () => {
              try {
                const created = await ports.sessions.createSession();
                await load();
                onFocusSession({
                  chatId: created.id,
                  label: created.title,
                });
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              }
            })();
          }}
          onPick={(id) => {
            const session = items.find((s) => s.id === id);
            onFocusSession({
              chatId: id,
              label: session?.title,
            });
          }}
          onDelete={(id) => {
            if (removeMode === "unavailable") {
              setError(sessionRemoveErrorMessage(removeMode));
              return;
            }
            void (async () => {
              try {
                const wasActive = id === activeChatId;
                if (removeMode === "archive") {
                  await ports.sessions.archiveSession(id);
                } else {
                  await ports.sessions.deleteSession(id);
                }
                const remaining = sessionsToHistoryItems(
                  await ports.sessions.listSessions(),
                );
                setItems(remaining);
                if (wasActive) {
                  const next = remaining[0];
                  if (next) {
                    onFocusSession({
                      chatId: next.id,
                      label: next.title,
                    });
                  } else {
                    onFocusSession({});
                  }
                }
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : sessionRemoveErrorMessage(removeMode),
                );
              }
            })();
          }}
          renamingId={renamingId}
          renameValue={renameValue}
          onStartRename={(id, title) => {
            if (!canRename) {
              setError("Rename is unavailable on this host.");
              return;
            }
            setRenamingId(id);
            setRenameValue(title);
          }}
          onCommitRename={() => {
            if (!canRename || !renamingId) {
              setRenamingId(null);
              return;
            }
            const sessionId = renamingId;
            const next = renameValue.trim();
            const prev = items.find((s) => s.id === sessionId)?.title;
            setRenamingId(null);
            if (!next || next === prev) {
              return;
            }
            void (async () => {
              try {
                await ports.sessions.renameSession(sessionId, next);
                await load();
                if (sessionId === activeChatId) {
                  onFocusSession({ chatId: sessionId, label: next });
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              }
            })();
          }}
          onCancelRename={() => {
            setRenamingId(null);
            setRenameValue("");
          }}
          onRenameValueChange={setRenameValue}
          renameInputRef={renameInputRef}
          searchInputRef={searchInputRef}
        />
      )}
    </aside>
  );
}
