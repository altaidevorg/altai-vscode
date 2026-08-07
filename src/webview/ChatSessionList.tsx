/**
 * Session history as a Desktop-style clock control + popover
 * (VS Code Activity Bar density — no permanent side rail).
 */

import {
  ChatHistoryPanel,
  groupSessionsByRecency,
  useCapability,
  useHostPorts,
  type SessionHistoryItem,
} from "@altai/agent-ui";
import { Add01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    void load();
    const onDoc = (event: MouseEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, load]);

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
      setMenuOpen(true);
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
        setMenuOpen(false);
      } catch (err) {
        setJournalBroken(isJournalUnavailableError(err));
        setError(formatHostUserError(err));
        setMenuOpen(true);
      }
    })();
  }, [canCreate, ports, load, onFocusSession]);

  if (!canList) {
    return null;
  }

  const historyLabel = menuOpen ? "Back to task" : "Chat sessions";

  return (
    <div className="altai-history-menu" ref={rootRef}>
      <button
        type="button"
        className="altai-ai-icon-btn"
        aria-label={historyLabel}
        title={historyLabel}
        aria-expanded={menuOpen}
        aria-pressed={menuOpen}
        aria-haspopup="menu"
        onClick={() => {
          setMenuOpen((open) => !open);
        }}
      >
        <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="altai-ai-icon-btn altai-history-menu-new-icon"
        aria-label="New chat"
        title="New chat"
        onClick={() => {
          createSession();
        }}
      >
        <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.75} />
      </button>
      {menuOpen ? (
        <div className="altai-history-menu-panel" role="menu">
          {error ? (
            <p className="altai-chat-history-error" role="alert">
              {error}
            </p>
          ) : null}
          {loading && items.length === 0 && !error ? (
            <p className="altai-shell-meta" style={{ padding: "0.75rem" }}>
              Loading sessions…
            </p>
          ) : journalBroken ? (
            <p className="altai-shell-meta" style={{ padding: "0.75rem" }}>
              Session history will return when the host journal is available.
            </p>
          ) : (
            <ChatHistoryPanel
              groups={groups}
              activeId={activeChatId}
              search={search}
              onSearchChange={setSearch}
              onNewChat={() => {
                createSession();
              }}
              onPick={(id) => {
                const session = items.find((s) => s.id === id);
                onFocusSession({
                  chatId: id,
                  label: session?.title,
                });
                setMenuOpen(false);
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
    </div>
  );
}
