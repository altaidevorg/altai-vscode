/**
 * Capability-gated Chat session history using shared ChatHistoryPanel.
 * Collapsed by default so the narrow Activity Bar retains the main chat column.
 */

import {
  ChatHistoryPanel,
  groupSessionsByRecency,
  useCapability,
  useHostPorts,
  type SessionHistoryItem,
} from "@altai/agent-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatHostUserError,
  isJournalUnavailableError,
} from "../shared/hostUserError.js";
import { sessionsToHistoryItems } from "./sessionHistoryMap.js";
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
  const canDelete = useCapability("sessions.delete");
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [journalBroken, setJournalBroken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!canList) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    setJournalBroken(false);
    try {
      const sessions = await ports.sessions.listSessions();
      setItems(sessionsToHistoryItems(sessions));
    } catch (err) {
      setJournalBroken(isJournalUnavailableError(err));
      setError(formatHostUserError(err));
      setItems([]);
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

  const createSession = useCallback(() => {
    if (!canCreate) {
      setError("Create session is unavailable on this host.");
      setExpanded(true);
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
        setError(null);
        setJournalBroken(false);
      } catch (err) {
        setJournalBroken(isJournalUnavailableError(err));
        setError(formatHostUserError(err));
        setExpanded(true);
      }
    })();
  }, [canCreate, ports, load, onFocusSession]);

  if (!canList) {
    return null;
  }

  const journalBlocked = journalBroken;
  // When journal fails the list always empty-errors; keep collapsed message compact.
  const showBody = expanded || (error !== null && !journalBlocked);

  return (
    <aside
      className={
        showBody
          ? "altai-chat-history-rail"
          : "altai-chat-history-rail altai-chat-history-rail--collapsed"
      }
      aria-label="Chat sessions"
    >
      <div className="altai-chat-history-toolbar">
        <button
          type="button"
          className="is-primary"
          onClick={() => {
            createSession();
          }}
        >
          New chat
        </button>
        <button
          type="button"
          aria-expanded={showBody}
          onClick={() => {
            setExpanded((value) => !value);
          }}
        >
          {showBody ? "Hide sessions" : "Sessions"}
          {items.length > 0 ? ` (${items.length})` : ""}
        </button>
      </div>
      {error ? (
        <p className="altai-chat-history-error" role="alert">
          {error}
        </p>
      ) : null}
      {showBody ? (
        <div className="altai-chat-history-body">
          {loading && items.length === 0 && !error ? (
            <p className="altai-shell-meta" style={{ padding: "0.75rem" }}>
              Loading sessions…
            </p>
          ) : journalBlocked ? (
            <p className="altai-shell-meta" style={{ padding: "0.75rem" }}>
              Session history will return when the host journal is available.
            </p>
          ) : (
            <ChatHistoryPanel
              groups={groups}
              activeId={activeChatId}
              search={search}
              onSearchChange={setSearch}
              onNewChat={createSession}
              onPick={(id) => {
                const session = items.find((s) => s.id === id);
                onFocusSession({
                  chatId: id,
                  label: session?.title,
                });
              }}
              onDelete={(id) => {
                if (!canDelete) {
                  setError("Delete is unavailable on this host.");
                  return;
                }
                void (async () => {
                  try {
                    const wasActive = id === activeChatId;
                    await ports.sessions.deleteSession(id);
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
                    setError(formatHostUserError(err));
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
                    setError(formatHostUserError(err));
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
        </div>
      ) : null}
    </aside>
  );
}
