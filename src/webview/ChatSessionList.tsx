/**
 * Capability-gated Chat session history using shared SessionRow chrome.
 */

import {
  groupSessionsByRecency,
  SessionRow,
  SurfacePrimaryAction,
  SurfaceSecondaryAction,
  useCapability,
  useHostPorts,
  type SessionHistoryItem,
} from "@altai/agent-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sessionsToHistoryItems } from "./sessionHistoryMap.js";

export type ChatSessionListProps = {
  activeChatId: string | null;
  onFocusSession: (input: { chatId?: string; label?: string }) => void;
  /** Bump to force list reload (e.g. after startRun). */
  refreshKey?: number;
};

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
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

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

  const groups = useMemo(
    () => groupSessionsByRecency(items),
    [items],
  );

  if (!canList) {
    return null;
  }

  return (
    <section className="altai-session-list" aria-label="Chat sessions">
      <div className="altai-session-list-header">
        <h2 className="altai-session-list-title">Sessions</h2>
        <div className="altai-session-list-actions">
          {canCreate ? (
            <SurfacePrimaryAction
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    const created = await ports.sessions.createSession();
                    await load();
                    onFocusSession({
                      chatId: created.id,
                      label: created.title,
                    });
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : String(err),
                    );
                  }
                })();
              }}
            >
              New
            </SurfacePrimaryAction>
          ) : null}
          <SurfaceSecondaryAction
            type="button"
            onClick={() => {
              void load();
            }}
            disabled={loading}
          >
            {loading ? "…" : "Refresh"}
          </SurfaceSecondaryAction>
        </div>
      </div>
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 && !loading ? (
        <p className="altai-shell-meta">No sessions yet.</p>
      ) : null}
      {groups.map((group) => (
        <div key={group.label} className="altai-session-group">
          <h3 className="altai-session-group-label">{group.label}</h3>
          <ul className="altai-session-group-list">
            {group.items.map((session) => (
              <li key={session.id}>
                <SessionRow
                  title={session.title}
                  active={session.id === activeChatId}
                  renaming={renamingId === session.id}
                  renameValue={
                    renamingId === session.id ? renameValue : session.title
                  }
                  renameInputRef={renameInputRef}
                  onPick={() => {
                    onFocusSession({
                      chatId: session.id,
                      label: session.title,
                    });
                  }}
                  onStartRename={() => {
                    if (!canRename) {
                      setError("Rename is unavailable on this host.");
                      return;
                    }
                    setRenamingId(session.id);
                    setRenameValue(session.title);
                  }}
                  onRenameValueChange={setRenameValue}
                  onCancelRename={() => {
                    setRenamingId(null);
                    setRenameValue("");
                  }}
                  onCommitRename={() => {
                    if (!canRename || renamingId !== session.id) {
                      setRenamingId(null);
                      return;
                    }
                    const next = renameValue.trim();
                    setRenamingId(null);
                    if (!next || next === session.title) {
                      return;
                    }
                    void (async () => {
                      try {
                        await ports.sessions.renameSession(session.id, next);
                        await load();
                        if (session.id === activeChatId) {
                          onFocusSession({ chatId: session.id, label: next });
                        }
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : String(err),
                        );
                      }
                    })();
                  }}
                  onDelete={() => {
                    if (!canDelete) {
                      setError("Delete is unavailable on this host.");
                      return;
                    }
                    void (async () => {
                      try {
                        const wasActive = session.id === activeChatId;
                        await ports.sessions.deleteSession(session.id);
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
                          err instanceof Error ? err.message : String(err),
                        );
                      }
                    })();
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
