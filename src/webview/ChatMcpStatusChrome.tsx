/**
 * Capability-gated MCP server status list (enable/disable + restart).
 */

import {
  SurfaceSecondaryAction,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import {
  canMountMcpStatus,
  mcpServerStatusCopy,
  mcpSummaryCopy,
  sortMcpServersForDisplay,
  type McpServerView,
} from "./mcpStatusChrome.js";

export type ChatMcpStatusChromeProps = {
  /** Settings hub starts expanded. */
  defaultOpen?: boolean;
  /** Hide collapsible chrome; always show list (Settings hub). */
  layout?: "inline" | "settings";
};

export function ChatMcpStatusChrome({
  defaultOpen = false,
  layout = "inline",
}: ChatMcpStatusChromeProps = {}) {
  const ports = useHostPorts();
  const canList = useCapability("mcp.list");
  const canRestart = useCapability("mcp.configure");
  const canShow = canMountMcpStatus({ mcpList: canList });
  const [servers, setServers] = useState<McpServerView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen || layout === "settings");

  const load = useCallback(async () => {
    if (!canShow) {
      setServers([]);
      setReady(false);
      return;
    }
    setError(null);
    try {
      const next = await ports.mcpSkills.listMcpServers();
      setServers(
        sortMcpServersForDisplay(
          next.map((server) => ({
            id: server.id,
            name: server.name,
            enabled: server.enabled,
            connected: server.connected,
            ...(server.error ? { error: server.error } : {}),
          })),
        ),
      );
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setReady(false);
    }
  }, [ports, canShow]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canShow) {
    return null;
  }

  return (
    <section
      className={
        layout === "settings"
          ? "altai-mcp-status altai-mcp-status--settings"
          : "altai-mcp-status"
      }
      aria-label="MCP servers"
    >
      <div className="altai-mcp-status-header">
        {layout === "settings" ? (
          <span className="altai-mcp-status-title">
            {ready ? mcpSummaryCopy(servers) : "MCP servers"}
          </span>
        ) : (
          <button
            type="button"
            className="altai-mcp-status-toggle"
            aria-expanded={open}
            onClick={() => {
              setOpen((value) => !value);
            }}
          >
            <span className="altai-mcp-status-title">
              {ready ? mcpSummaryCopy(servers) : "MCP servers"}
            </span>
          </button>
        )}
        <SurfaceSecondaryAction
          type="button"
          disabled={busyId !== null}
          onClick={() => {
            void load();
          }}
        >
          Refresh
        </SurfaceSecondaryAction>
      </div>
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      {open || layout === "settings" ? (
        <ul className="altai-mcp-status-list">
          {!ready && !error ? (
            <li className="altai-shell-meta">Loading MCP…</li>
          ) : null}
          {ready && servers.length === 0 ? (
            <li className="altai-shell-meta">No MCP servers reported.</li>
          ) : null}
          {servers.map((server) => {
            const busy = busyId === server.id;
            return (
              <li key={server.id} className="altai-mcp-status-row">
                <div className="altai-mcp-status-meta">
                  <span className="altai-mcp-status-name">{server.name}</span>
                  <span className="altai-mcp-status-state">
                    {mcpServerStatusCopy(server)}
                  </span>
                </div>
                {canRestart ? (
                  <>
                    <SurfaceSecondaryAction
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void (async () => {
                          setBusyId(server.id);
                          setError(null);
                          try {
                            await ports.mcpSkills.setMcpServerEnabled(
                              server.id,
                              !server.enabled,
                            );
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : String(err),
                            );
                          } finally {
                            setBusyId(null);
                          }
                        })();
                      }}
                    >
                      {busy
                        ? "…"
                        : server.enabled
                          ? "Disable"
                          : "Enable"}
                    </SurfaceSecondaryAction>
                    <SurfaceSecondaryAction
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void (async () => {
                          setBusyId(server.id);
                          setError(null);
                          try {
                            await ports.mcpSkills.restartMcpServer(server.id);
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : String(err),
                            );
                          } finally {
                            setBusyId(null);
                          }
                        })();
                      }}
                    >
                      {busy ? "…" : "Restart"}
                    </SurfaceSecondaryAction>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
