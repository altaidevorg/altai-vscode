import {
  HostPortsProvider,
  SurfaceEmptyState,
  SurfaceHeader,
  useCapability,
  useHostPorts,
  type Capabilities,
} from "@altai/agent-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HOST_RPC_NOTIFICATION_EVENT,
  HOST_STATUS_EVENT,
  type HostRpcNotificationPayload,
  type HostStatusPayload,
} from "../shared/messages.js";
import { parsePersistedWebviewState } from "../shared/webviewState.js";
import type { WebviewClient } from "./WebviewClient.js";
import {
  createVsCodeHostPorts,
  type HostRpcTransport,
} from "./host/createVsCodeHostPorts.js";

export type AltaiAppProps = {
  client: WebviewClient;
  extensionVersion: string;
};

function isHostStatusPayload(value: unknown): value is HostStatusPayload {
  const parsed = parsePersistedWebviewState({ hostStatus: value }).hostStatus;
  return parsed !== undefined;
}

function isHostRpcNotification(
  value: unknown,
): value is HostRpcNotificationPayload {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { method?: unknown }).method === "string"
  );
}

/**
 * Shared-UI shell + TASK-009 chat vertical slice (HostPorts over native RPC).
 */
export function AltaiApp({ client, extensionVersion }: AltaiAppProps) {
  const hostReadyRef = useRef(false);
  const [nativeCapabilities, setNativeCapabilities] = useState<readonly string[] | null>(null);
  const [hostStatus, setHostStatus] = useState<HostStatusPayload>(() => {
    const previous = client.getPersistedState().hostStatus;
    if (isHostStatusPayload(previous)) {
      hostReadyRef.current = previous.status === "ready";
      return previous;
    }
    return {
      status: "disconnected",
      message: "ALTAI host not connected",
      extensionVersion,
    };
  });
  hostReadyRef.current = hostStatus.status === "ready";

  const transport = useMemo<HostRpcTransport>(
    () => ({
      // MessageBridge.request(method, { params }) — the inner object is the
      // host.request payload ({ method, params? }), not a second wrapper.
      request: (method, params) =>
        client.request("host.request", {
          params:
            params === undefined
              ? { method }
              : { method, params },
        }),
      requestWorkspace: (method, params) =>
        client.request("workspace.request", {
          params:
            params === undefined
              ? { method }
              : { method, params },
        }),
      onNotification: (listener) =>
        client.onEvent(HOST_RPC_NOTIFICATION_EVENT, (payload) => {
          if (isHostRpcNotification(payload)) {
            listener(payload);
          }
        }),
    }),
    [client],
  );

  const ports = useMemo(
    () =>
      createVsCodeHostPorts({
        hostVersion: extensionVersion,
        isHostReady: () => hostReadyRef.current,
        getNativeCapabilities: () => nativeCapabilities,
        transport,
      }),
    [extensionVersion, nativeCapabilities, transport],
  );

  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ports.runtime
      .initialize({
        protocolMin: 1,
        protocolMax: 1,
        clientName: "altai-vscode-webview",
        clientVersion: extensionVersion,
      })
      .then((caps) => {
        if (!cancelled) {
          setCapabilities(caps);
          setInitError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Runtime initialize failed";
          setInitError(message);
          setCapabilities(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ports, extensionVersion, hostStatus.status]);

  useEffect(() => {
    const off = client.onEvent(HOST_STATUS_EVENT, (payload) => {
      if (isHostStatusPayload(payload)) {
        setHostStatus(payload);
        client.setPersistedState({ hostStatus: payload });
      }
    });
    void client
      .request("host.getStatus")
      .then((result) => {
        if (isHostStatusPayload(result)) {
          setHostStatus(result);
          client.setPersistedState({ hostStatus: result });
        }
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "host.getStatus failed";
        setHostStatus((prev) => ({
          ...prev,
          status: "error",
          message: `Host status unavailable: ${message}`,
        }));
      });
    void client
      .request("host.getCapabilities")
      .then((result) => {
        if (Array.isArray(result) && result.every((item) => typeof item === "string")) {
          setNativeCapabilities(result);
        }
      })
      .catch(() => {
        setNativeCapabilities([]);
      });
    return off;
  }, [client]);

  return (
    <HostPortsProvider ports={ports} capabilities={capabilities}>
      <div className="altai-shell">
        <SurfaceHeader
          title="ALTAI"
          subtitle={hostStatus.message}
          status={
            <span className="altai-host-pill" data-status={hostStatus.status}>
              {hostStatus.status}
            </span>
          }
        />
        <AgentUiShell hostStatus={hostStatus} initError={initError} />
      </div>
    </HostPortsProvider>
  );
}

function AgentUiShell({
  hostStatus,
  initError,
}: {
  hostStatus: HostStatusPayload;
  initError: string | null;
}) {
  const ports = useHostPorts();
  const canInitialize = useCapability("runtime.initialize");
  const canStartRun = useCapability("runtime.startRun");
  const canListSessions = useCapability("sessions.list");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  useEffect(() => {
    return ports.events.subscribe((event) => {
      const summary =
        typeof event.payload === "object" &&
        event.payload &&
        "text" in (event.payload as object) &&
        typeof (event.payload as { text?: unknown }).text === "string"
          ? (event.payload as { text: string }).text
          : `${event.type} · seq ${event.seq}`;
      setLines((prev) => [...prev.slice(-200), summary]);
    });
  }, [ports]);

  const onSubmit = async (): Promise<void> => {
    const text = prompt.trim();
    if (!text || busy || !canStartRun) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ref = await ports.runtime.startRun({
        prompt: text,
        ...(activeChatId ? { chatId: activeChatId } : {}),
      });
      setActiveChatId(ref.chatId);
      setActiveRunId(ref.runId);
      setLines((prev) => [...prev, `You: ${text}`]);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async (): Promise<void> => {
    if (!activeChatId || !activeRunId) {
      return;
    }
    try {
      await ports.runtime.cancelRun({
        chatId: activeChatId,
        runId: activeRunId,
      });
      setLines((prev) => [...prev, "Run cancelled"]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (initError || hostStatus.status !== "ready") {
    return (
      <main className="altai-shell-body">
        <SurfaceEmptyState
          title={
            initError
              ? "Shared UI failed to initialize"
              : "Waiting for agent host"
          }
          description={initError ?? hostStatus.message}
        />
        <CapabilityList
          canInitialize={canInitialize}
          canStartRun={canStartRun}
          canListSessions={canListSessions}
        />
      </main>
    );
  }

  return (
    <main className="altai-shell-body">
      <div className="altai-chat-log" role="log" aria-live="polite">
        {lines.length === 0 ? (
          <p className="altai-shell-meta">
            Host ready. Send a prompt to start a run (TASK-009 vertical slice).
          </p>
        ) : (
          lines.map((line, index) => (
            <p key={`${index}:${line.slice(0, 24)}`} className="altai-chat-line">
              {line}
            </p>
          ))
        )}
      </div>
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      <form
        className="altai-chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <textarea
          className="altai-chat-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            canStartRun ? "Ask ALTAI…" : "Start run capability unavailable"
          }
          disabled={!canStartRun || busy}
          rows={3}
        />
        <div className="altai-chat-actions">
          <button type="submit" disabled={!canStartRun || busy || !prompt.trim()}>
            {busy ? "Starting…" : "Send"}
          </button>
          <button
            type="button"
            disabled={!activeRunId || busy}
            onClick={() => void onCancel()}
          >
            Cancel
          </button>
        </div>
      </form>
      <CapabilityList
        canInitialize={canInitialize}
        canStartRun={canStartRun}
        canListSessions={canListSessions}
      />
      <p className="altai-shell-meta">
        Extension {hostStatus.extensionVersion} · UI from @altai/agent-ui
        {activeChatId ? ` · chat ${activeChatId}` : ""}
      </p>
    </main>
  );
}

function CapabilityList({
  canInitialize,
  canStartRun,
  canListSessions,
}: {
  canInitialize: boolean;
  canStartRun: boolean;
  canListSessions: boolean;
}) {
  return (
    <ul className="altai-capability-list" aria-label="Host capabilities">
      <CapabilityRow
        label="Initialize runtime"
        enabled={canInitialize}
        detail="HostPorts.runtime.initialize"
      />
      <CapabilityRow
        label="Start agent run"
        enabled={canStartRun}
        detail={canStartRun ? "Proxied to run/start" : "Waiting for host ready"}
      />
      <CapabilityRow
        label="List sessions"
        enabled={canListSessions}
        detail={
          canListSessions ? "Proxied to sessions/list" : "Waiting for host ready"
        }
      />
    </ul>
  );
}

function CapabilityRow({
  label,
  enabled,
  detail,
}: {
  label: string;
  enabled: boolean;
  detail?: string;
}) {
  return (
    <li
      className={
        enabled
          ? "altai-capability altai-capability--on"
          : "altai-capability altai-capability--off"
      }
    >
      <span className="altai-capability-label">{label}</span>
      <span className="altai-capability-state">
        {enabled ? "available" : "hidden / deferred"}
      </span>
      {detail ? <span className="altai-capability-detail">{detail}</span> : null}
    </li>
  );
}
