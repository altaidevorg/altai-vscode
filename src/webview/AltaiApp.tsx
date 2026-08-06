import {
  ChatTabStrip,
  ComposerPrimaryRow,
  ComposerShell,
  ComposerTextArea,
  EmptyState,
  HostPortsProvider,
  SurfaceEmptyState,
  SurfaceHeader,
  useCapability,
  useHostPorts,
  type Capabilities,
  type OperationsView,
  type WorkHubView,
} from "@altai/agent-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HOST_RPC_NOTIFICATION_EVENT,
  HOST_STATUS_EVENT,
  OPEN_OPERATIONS_EVENT,
  type HostRpcNotificationPayload,
  type HostStatusPayload,
  type OpenOperationsPayload,
} from "../shared/messages.js";
import {
  mergePersistedWebviewState,
  parsePersistedWebviewState,
  type PersistedAltaiSurface,
  type PersistedOperationsView,
  type PersistedWorkHubView,
  type PersistedWebviewState,
} from "../shared/webviewState.js";
import { OperationsPanel } from "./OperationsPanel.js";
import { OperationsAttentionReporter } from "./OperationsAttentionReporter.js";
import {
  buildOpenChatFocus,
  chatFocusStatusLine,
  type OpenChatFocus,
} from "./openChatDeepLink.js";
import {
  appendMetaMessage,
  appendUserMessage,
  applyAgentEventToMessages,
  displayMessagesFromSession,
  shouldShowChatEmptyHome,
  type ChatDisplayMessage,
} from "./chatDisplayMessage.js";
import { ChatMessageList } from "./ChatMessageList.js";
import { ChatSessionList } from "./ChatSessionList.js";
import { ChatPermissionModeChrome } from "./ChatPermissionModeChrome.js";
import { ChatModelPickerChrome } from "./ChatModelPickerChrome.js";
import { ChatProviderStatusChrome } from "./ChatProviderStatusChrome.js";
import { ChatInteractivePrompts } from "./ChatInteractivePrompts.js";
import { ChatComposerFollowup } from "./ChatComposerFollowup.js";
import {
  resolveComposerSubmitMode,
} from "./composerFollowupChrome.js";
import {
  applyInteractivePrompt,
  interactivePromptFromAgentEvent,
  type PendingClarificationPrompt,
  type PendingToolApproval,
} from "./interactivePrompt.js";
import { parseOpenOperationsPayload } from "./operationsDeepLink.js";
import type { WebviewClient } from "./WebviewClient.js";
import {
  createVsCodeHostPorts,
  type HostRpcTransport,
} from "./host/createVsCodeHostPorts.js";
import type { PermissionMode } from "@altai/host-contract";

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

function patchPersistedState(
  client: WebviewClient,
  patch: PersistedWebviewState,
): void {
  client.setPersistedState(
    mergePersistedWebviewState(client.getPersistedState(), patch),
  );
}

/**
 * Host shell: shared agent-ui chrome for chat (V3) + Operations, wired through
 * HostPorts over the native RPC host.
 */
export function AltaiApp({ client, extensionVersion }: AltaiAppProps) {
  const hostReadyRef = useRef(false);
  const [nativeCapabilities, setNativeCapabilities] = useState<readonly string[] | null>(null);
  const persisted = client.getPersistedState();
  const [hostStatus, setHostStatus] = useState<HostStatusPayload>(() => {
    const previous = persisted.hostStatus;
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
  const [surface, setSurface] = useState<PersistedAltaiSurface>(
    () => persisted.surface ?? "chat",
  );
  const [operationsView, setOperationsView] = useState<PersistedOperationsView>(
    () => persisted.operationsView ?? "overview",
  );
  const [workHubView, setWorkHubView] = useState<PersistedWorkHubView>(
    () => persisted.workHubView ?? "runs",
  );
  const [operationsNav, setOperationsNav] = useState<
    OpenOperationsPayload | undefined
  >(undefined);
  const [chatFocus, setChatFocus] = useState<OpenChatFocus | undefined>(
    () =>
      persisted.activeChatId
        ? buildOpenChatFocus({ chatId: persisted.activeChatId }, 0)
        : undefined,
  );

  const selectSurface = useCallback(
    (next: PersistedAltaiSurface) => {
      setSurface(next);
      patchPersistedState(client, { surface: next });
    },
    [client],
  );

  const openChatFromOperations = useCallback(
    (input: { chatId?: string; label?: string }) => {
      const focus = buildOpenChatFocus(input);
      setChatFocus(focus);
      selectSurface("chat");
      // Empty string clears focus so parse/getState drop the field on read.
      patchPersistedState(client, {
        activeChatId: focus.chatId ?? "",
      });
    },
    [client, selectSurface],
  );

  const onOperationsPresentationChange = useCallback(
    (next: {
      operationsView: OperationsView;
      workHubView: WorkHubView;
    }) => {
      const opsView = next.operationsView as PersistedOperationsView;
      const hub = next.workHubView as PersistedWorkHubView;
      setOperationsView(opsView);
      setWorkHubView(hub);
      patchPersistedState(client, {
        operationsView: opsView,
        workHubView: hub,
      });
    },
    [client],
  );

  const reportAttentionCount = useCallback(
    (count: number) => {
      void client
        .request("operations.reportAttention", {
          params: { count },
        })
        .catch(() => {
          /* Status-bar badge is best-effort presentation. */
        });
    },
    [client],
  );

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
        patchPersistedState(client, { hostStatus: payload });
      }
    });
    void client
      .request("host.getStatus")
      .then((result) => {
        if (isHostStatusPayload(result)) {
          setHostStatus(result);
          patchPersistedState(client, { hostStatus: result });
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

  useEffect(() => {
    return client.onEvent(OPEN_OPERATIONS_EVENT, (payload) => {
      const parsed = parseOpenOperationsPayload(payload);
      if (!parsed) return;
      selectSurface("operations");
      setOperationsNav(parsed);
      const opsView = parsed.view as PersistedOperationsView;
      const hub = (parsed.workHubView ?? workHubView) as PersistedWorkHubView;
      setOperationsView(opsView);
      if (parsed.workHubView) {
        setWorkHubView(hub);
      }
      patchPersistedState(client, {
        surface: "operations",
        operationsView: opsView,
        ...(parsed.workHubView ? { workHubView: hub } : {}),
      });
    });
  }, [client, selectSurface, workHubView]);

  // Clear the badge when the host is not usable so stale counts do not linger.
  useEffect(() => {
    if (hostStatus.status !== "ready" || initError) {
      reportAttentionCount(0);
    }
  }, [hostStatus.status, initError, reportAttentionCount]);

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
        <div className="altai-view-tabs" role="tablist" aria-label="ALTAI surfaces">
          <button
            type="button"
            role="tab"
            aria-selected={surface === "chat"}
            className="altai-view-tab"
            onClick={() => selectSurface("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={surface === "operations"}
            className="altai-view-tab"
            onClick={() => selectSurface("operations")}
          >
            Operations
          </button>
        </div>
        {hostStatus.status === "ready" && !initError ? (
          surface === "operations" ? (
            <OperationsPanel
              navigation={operationsNav}
              initialView={operationsView}
              initialWorkHubView={workHubView}
              onPresentationChange={onOperationsPresentationChange}
              onAttentionCountChange={reportAttentionCount}
              onOpenChat={openChatFromOperations}
              focusedChatId={chatFocus?.chatId ?? null}
            />
          ) : (
            <>
              <OperationsAttentionReporter onCount={reportAttentionCount} />
              <AgentUiShell
                hostStatus={hostStatus}
                initError={initError}
                chatFocus={chatFocus}
                onFocusChat={openChatFromOperations}
              />
            </>
          )
        ) : (
          <AgentUiShell
            hostStatus={hostStatus}
            initError={initError}
            chatFocus={chatFocus}
            onFocusChat={openChatFromOperations}
          />
        )}
      </div>
    </HostPortsProvider>
  );
}

function AgentUiShell({
  hostStatus,
  initError,
  chatFocus,
  onFocusChat,
}: {
  hostStatus: HostStatusPayload;
  initError: string | null;
  chatFocus?: OpenChatFocus;
  onFocusChat: (input: { chatId?: string; label?: string }) => void;
}) {
  const ports = useHostPorts();
  const canInitialize = useCapability("runtime.initialize");
  const canStartRun = useCapability("runtime.startRun");
  const canSteer = useCapability("runtime.steerRun");
  const canQueue = useCapability("runtime.queueRun");
  const canListSessions = useCapability("sessions.list");
  const canMessages = useCapability("sessions.messages");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [openTabs, setOpenTabs] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    () => chatFocus?.chatId ?? null,
  );
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [sessionListKey, setSessionListKey] = useState(0);
  const [permissionMode, setPermissionMode] = useState<PermissionMode | null>(
    null,
  );
  const [pendingApprovals, setPendingApprovals] = useState<
    PendingToolApproval[]
  >([]);
  const [pendingClarification, setPendingClarification] =
    useState<PendingClarificationPrompt | null>(null);
  const appliedFocus = useRef<{ key: number; withTranscript: boolean } | null>(
    null,
  );
  const activeChatIdRef = useRef<string | null>(activeChatId);
  activeChatIdRef.current = activeChatId;
  const activeRunIdRef = useRef<string | null>(activeRunId);
  activeRunIdRef.current = activeRunId;

  const rememberTab = useCallback((id: string, title?: string) => {
    setOpenTabs((prev) => {
      const existing = prev.find((tab) => tab.id === id);
      if (existing) {
        if (title && existing.title !== title) {
          return prev.map((tab) =>
            tab.id === id ? { ...tab, title } : tab,
          );
        }
        return prev;
      }
      return [...prev, { id, title: title?.trim() || "New chat" }].slice(-8);
    });
  }, []);

  useEffect(() => {
    if (!chatFocus) {
      return;
    }
    const needTranscript = Boolean(chatFocus.chatId && canMessages);
    if (
      appliedFocus.current?.key === chatFocus.key &&
      appliedFocus.current.withTranscript === needTranscript
    ) {
      return;
    }
    appliedFocus.current = {
      key: chatFocus.key,
      withTranscript: needTranscript,
    };
    if (chatFocus.chatId) {
      setActiveChatId(chatFocus.chatId);
      setActiveRunId(null);
      rememberTab(chatFocus.chatId, chatFocus.label);
    }

    const status = chatFocusStatusLine(chatFocus);
    const chatId = chatFocus.chatId;

    if (!chatId) {
      // New / cleared chat — empty home until the user sends.
      setMessages([]);
      return;
    }
    if (!canMessages) {
      setMessages(appendMetaMessage([], status));
      return;
    }

    let cancelled = false;
    setMessages(appendMetaMessage([], "Loading transcript…"));
    void ports.sessions
      .listMessages(chatId)
      .then((sessionMessages) => {
        if (cancelled) {
          return;
        }
        setMessages(displayMessagesFromSession(sessionMessages));
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        setMessages(
          appendMetaMessage([], `Transcript unavailable · ${message}`),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [chatFocus, canMessages, ports, rememberTab]);

  useEffect(() => {
    return ports.events.subscribe((event) => {
      setMessages((prev) =>
        applyAgentEventToMessages(prev, event, {
          activeChatId: activeChatIdRef.current,
        }),
      );

      // Clear active-run bookkeeping when this chat's run ends.
      if (
        event.type === "lifecycle" &&
        event.chatId &&
        event.chatId === activeChatIdRef.current &&
        event.runId === activeRunIdRef.current
      ) {
        const body =
          event.payload &&
          typeof event.payload === "object" &&
          !Array.isArray(event.payload)
            ? (event.payload as Record<string, unknown>)
            : {};
        const crateType =
          (typeof body.type === "string" && body.type) ||
          (body.event &&
            typeof body.event === "object" &&
            body.event &&
            typeof (body.event as { type?: unknown }).type === "string" &&
            (body.event as { type: string }).type) ||
          "";
        if (
          crateType === "run_terminated" ||
          crateType === "run_cancelled" ||
          body.outcome !== undefined
        ) {
          setActiveRunId(null);
        }
      }

      const promptEvent = interactivePromptFromAgentEvent(event);
      if (!promptEvent) {
        return;
      }
      const currentChat = activeChatIdRef.current;
      if (currentChat && promptEvent.chatId !== currentChat) {
        return;
      }
      if (promptEvent.kind === "tool") {
        setPendingApprovals((prev) =>
          applyInteractivePrompt(prev, null, promptEvent).approvals,
        );
      } else {
        setPendingClarification(promptEvent);
        if (promptEvent.content) {
          setMessages((prev) =>
            appendMetaMessage(prev, `ALTAI: ${promptEvent.content}`),
          );
        }
      }
    });
  }, [ports]);

  // Clear pending decisions when switching sessions.
  useEffect(() => {
    setPendingApprovals([]);
    setPendingClarification(null);
  }, [activeChatId]);

  const onSubmit = async (preferSteer = false): Promise<void> => {
    const text = prompt.trim();
    if (!text || busy) {
      return;
    }
    const mode = resolveComposerSubmitMode({
      hasActiveRun: Boolean(activeRunId && activeChatId),
      canStartRun,
      canSteer,
      canQueue,
      hasPrompt: true,
      preferSteer,
    });

    if (mode === "start" && !canStartRun) {
      return;
    }
    if (mode === "steer" && (!canSteer || !activeChatId || !activeRunId)) {
      return;
    }
    if (mode === "queue" && !canQueue) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === "steer" && activeChatId && activeRunId) {
        await ports.runtime.steerRun({
          chatId: activeChatId,
          runId: activeRunId,
          prompt: text,
        });
        setMessages((prev) => appendUserMessage(prev, text));
        setMessages((prev) => appendMetaMessage(prev, "Steer sent"));
        setPrompt("");
        return;
      }

      const ref = await ports.runtime.startRun({
        prompt: text,
        ...(activeChatId ? { chatId: activeChatId } : {}),
        ...(permissionMode ? { permissionMode } : {}),
        ...(mode === "queue" ? { queue: true } : {}),
      });
      setActiveChatId(ref.chatId);
      if (mode !== "queue") {
        setActiveRunId(ref.runId);
      }
      rememberTab(ref.chatId);
      setMessages((prev) => appendUserMessage(prev, text));
      if (mode === "queue") {
        setMessages((prev) => appendMetaMessage(prev, "Queued next run"));
      }
      setPrompt("");
      setSessionListKey((key) => key + 1);
      if (ref.chatId !== activeChatId) {
        onFocusChat({ chatId: ref.chatId });
      }
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
      setMessages((prev) => appendMetaMessage(prev, "Run cancelled"));
      setActiveRunId(null);
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
          canMessages={canMessages}
        />
      </main>
    );
  }

  const showEmptyHome = shouldShowChatEmptyHome(messages);

  return (
    <main className="altai-shell-body altai-shell-body--chat">
      <div className="altai-chat-layout">
        <ChatSessionList
          activeChatId={activeChatId}
          onFocusSession={(input) => {
            if (input.chatId) {
              rememberTab(input.chatId, input.label);
            }
            onFocusChat(input);
          }}
          refreshKey={sessionListKey}
        />
        <div className="altai-chat-main">
          {openTabs.length > 0 ? (
            <ChatTabStrip
              tabs={openTabs}
              activeId={activeChatId}
              onSelect={(id) => {
                const tab = openTabs.find((item) => item.id === id);
                onFocusChat({ chatId: id, label: tab?.title });
              }}
              onClose={(id) => {
                setOpenTabs((prev) => prev.filter((tab) => tab.id !== id));
                if (id === activeChatId) {
                  const remaining = openTabs.filter((tab) => tab.id !== id);
                  const next = remaining[remaining.length - 1];
                  if (next) {
                    onFocusChat({ chatId: next.id, label: next.title });
                  } else {
                    setActiveChatId(null);
                    setMessages([]);
                    onFocusChat({});
                  }
                }
              }}
              onNewChat={() => {
                setActiveChatId(null);
                setActiveRunId(null);
                setMessages([]);
                onFocusChat({});
              }}
            />
          ) : null}
          <div className="altai-chat-scroll">
            {showEmptyHome ? (
              <EmptyState agentName="ALTAI" />
            ) : (
              <ChatMessageList messages={messages} />
            )}
            {error ? (
              <p className="altai-chat-error" role="alert">
                {error}
              </p>
            ) : null}
            <ChatInteractivePrompts
              approvals={pendingApprovals}
              clarification={pendingClarification}
              onApprovalsChange={setPendingApprovals}
              onClarificationChange={setPendingClarification}
            />
          </div>
          <div className="altai-chat-composer-dock">
            <form
              className="altai-chat-composer-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <ComposerShell busy={busy}>
                <div className="px-2.5 pt-2">
                  <ComposerTextArea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={
                      activeRunId
                        ? canQueue || canSteer
                          ? "Follow up — Enter queues · ⌘/Ctrl+Enter steers"
                          : "Describe what should change…"
                        : canStartRun
                          ? "Describe what should change…"
                          : "Start run capability unavailable"
                    }
                    disabled={
                      busy ||
                      (!canStartRun &&
                        !(activeRunId && (canSteer || canQueue)))
                    }
                    rows={2}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        void onSubmit(event.metaKey || event.ctrlKey);
                      }
                    }}
                  />
                </div>
                <ChatComposerFollowup
                  hasActiveRun={Boolean(activeRunId && activeChatId)}
                  hasPrompt={Boolean(prompt.trim())}
                  onSteer={() => void onSubmit(true)}
                  onQueue={() => void onSubmit(false)}
                />
                <ComposerPrimaryRow
                  tools={
                    <>
                      <ChatModelPickerChrome />
                    </>
                  }
                  permission={
                    <ChatPermissionModeChrome
                      onModeChange={setPermissionMode}
                    />
                  }
                  submit={
                    <>
                      <button
                        type="button"
                        className="altai-composer-stop"
                        disabled={!activeRunId || busy}
                        onClick={() => void onCancel()}
                      >
                        Stop
                      </button>
                      <button
                        type="submit"
                        className="altai-composer-submit"
                        disabled={
                          busy ||
                          !prompt.trim() ||
                          (!canStartRun &&
                            !(activeRunId && (canSteer || canQueue)))
                        }
                      >
                        {busy
                          ? "Working…"
                          : activeRunId && canQueue
                            ? "Queue"
                            : "Send"}
                      </button>
                    </>
                  }
                />
              </ComposerShell>
            </form>
          </div>
          <div className="altai-chat-footer">
            <ChatProviderStatusChrome />
            <p className="altai-shell-meta">
              Extension {hostStatus.extensionVersion}
              {activeChatId ? ` · chat ${activeChatId}` : ""}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function CapabilityList({
  canInitialize,
  canStartRun,
  canListSessions,
  canMessages = false,
}: {
  canInitialize: boolean;
  canStartRun: boolean;
  canListSessions: boolean;
  canMessages?: boolean;
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
      <CapabilityRow
        label="Session messages"
        enabled={canMessages}
        detail={
          canMessages
            ? "Load transcript on Operations → Chat open"
            : "Waiting for host ready"
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
