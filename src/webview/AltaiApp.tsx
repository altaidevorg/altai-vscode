import {
  HostPortsProvider,
  SurfaceEmptyState,
  SurfaceHeader,
  useCapability,
  useHostPorts,
  type Capabilities,
} from "@altai/agent-ui";
import { useEffect, useMemo, useState } from "react";
import {
  HOST_STATUS_EVENT,
  type HostStatusPayload,
} from "../shared/messages.js";
import { parsePersistedWebviewState } from "../shared/webviewState.js";
import type { WebviewClient } from "./WebviewClient.js";
import { createVsCodeHostPorts } from "./host/createVsCodeHostPorts.js";

export type AltaiAppProps = {
  client: WebviewClient;
  extensionVersion: string;
};

function isHostStatusPayload(value: unknown): value is HostStatusPayload {
  const parsed = parsePersistedWebviewState({ hostStatus: value }).hostStatus;
  return parsed !== undefined;
}

/**
 * Shared-UI shell for TASK-008. Renders `@altai/agent-ui` chrome with
 * capability gating; full chat vertical slice is TASK-009.
 */
export function AltaiApp({ client, extensionVersion }: AltaiAppProps) {
  const ports = useMemo(
    () => createVsCodeHostPorts({ hostVersion: extensionVersion }),
    [extensionVersion],
  );
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [hostStatus, setHostStatus] = useState<HostStatusPayload>(() => {
    const previous = client.getPersistedState().hostStatus;
    if (isHostStatusPayload(previous)) {
      return previous;
    }
    return {
      status: "disconnected",
      message: "ALTAI host not connected",
      extensionVersion,
    };
  });

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
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ports, extensionVersion]);

  useEffect(() => {
    const off = client.onEvent(HOST_STATUS_EVENT, (payload) => {
      if (isHostStatusPayload(payload)) {
        setHostStatus(payload);
        client.setPersistedState({ hostStatus: payload });
      }
    });
    void client.request("host.getStatus").then((result) => {
      if (isHostStatusPayload(result)) {
        setHostStatus(result);
        client.setPersistedState({ hostStatus: result });
      }
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
        <AgentUiShell hostStatus={hostStatus} />
      </div>
    </HostPortsProvider>
  );
}

function AgentUiShell({ hostStatus }: { hostStatus: HostStatusPayload }) {
  // Touch ports so missing provider fails loudly during mount.
  useHostPorts();
  const canInitialize = useCapability("runtime.initialize");
  const canStartRun = useCapability("runtime.startRun");
  const canListSessions = useCapability("sessions.list");

  return (
    <main className="altai-shell-body">
      <SurfaceEmptyState
        title={
          hostStatus.status === "ready"
            ? "Shared UI connected"
            : "Waiting for agent host"
        }
        description={
          hostStatus.status === "ready"
            ? "VS Code is rendering @altai/agent-ui. Chat sessions and runs land in the next vertical slice."
            : hostStatus.message
        }
      />
      <ul className="altai-capability-list" aria-label="Host capabilities">
        <CapabilityRow
          label="Initialize runtime"
          enabled={canInitialize}
          detail="HostPorts.runtime.initialize"
        />
        <CapabilityRow
          label="Start agent run"
          enabled={canStartRun}
          detail="Deferred until TASK-009"
        />
        <CapabilityRow
          label="List sessions"
          enabled={canListSessions}
          detail="Deferred until TASK-009"
        />
      </ul>
      <p className="altai-shell-meta">
        Extension {hostStatus.extensionVersion} · UI from @altai/agent-ui
      </p>
    </main>
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
