import {
  ChatTabStrip,
  ComposerConfigRow,
  ComposerPrimaryRow,
  ComposerShell,
  ComposerTextArea,
  detectSlashOrSnippetTrigger,
  EmptyState,
  HostPortsProvider,
  SurfaceEmptyState,
  SurfaceHeader,
  SurfaceSecondaryAction,
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
  OPEN_CHAT_WITH_SELECTION_EVENT,
  OPEN_CHAT_WITH_FILE_EVENT,
  OPEN_OPERATIONS_EVENT,
  type HostRpcNotificationPayload,
  type HostStatusPayload,
  type OpenOperationsPayload,
  type OperationsDeepLinkView,
  type OperationsDeepLinkWorkHubView,
} from "../shared/messages.js";
import {
  parseOpenChatWithSelectionPayload,
  type OpenChatWithSelectionPayload,
} from "../shared/selectionDeepLink.js";
import {
  parseOpenChatWithFilePayload,
  type OpenChatWithFilePayload,
} from "../shared/fileDeepLink.js";
import {
  mergePersistedWebviewState,
  parsePersistedWebviewState,
  type PersistedAltaiSurface,
  type PersistedOperationsView,
  type PersistedWorkHubView,
  type PersistedWebviewState,
} from "../shared/webviewState.js";
import { recoveryHintForDiagnosticCode } from "../shared/hostRecovery.js";
import { listRecoveryActions } from "./hostRecoveryActions.js";
import { formatDiagnosticClipboardText } from "./waitShellChrome.js";
import { OperationsPanel } from "./OperationsPanel.js";
import { OperationsAttentionReporter } from "./OperationsAttentionReporter.js";
import { ChatSettingsHub } from "./ChatSettingsHub.js";
import {
  ALTAI_SURFACES,
  nextAltaiSurface,
  type AltaiSurfaceId,
} from "./surfaceTabsChrome.js";
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
import {
  canEditUserMessage,
  parseUserTurnId,
  truncateBoundaryForEdit,
  truncateDisplayAfterUserTurn,
  withStableUserTurnIds,
} from "./chatMessageEdit.js";
import { ChatMessageList } from "./ChatMessageList.js";
import { formatTranscriptForCopy } from "./transcriptCopyChrome.js";
import { ChatSessionList } from "./ChatSessionList.js";
import { ChatPermissionModeChrome } from "./ChatPermissionModeChrome.js";
import { ChatModelPickerChrome } from "./ChatModelPickerChrome.js";
import {
  canMountModelPicker,
  modelIdForStartRun,
} from "./modelPickerChrome.js";
import { ChatProviderStatusChrome } from "./ChatProviderStatusChrome.js";
import { ChatProviderConnectBanner } from "./ChatProviderConnectBanner.js";
import { ChatShellTopbar } from "./ChatShellTopbar.js";
import { ChatInteractivePrompts } from "./ChatInteractivePrompts.js";
import { ChatProjectTargetChrome } from "./ChatProjectTargetChrome.js";
import { ChatMcpStatusChrome } from "./ChatMcpStatusChrome.js";
import { ChatSkillsStatusChrome } from "./ChatSkillsStatusChrome.js";
import { ChatChangeReviewPanel } from "./ChatChangeReviewPanel.js";
import { ChatReplayChrome } from "./ChatReplayChrome.js";
import { ChatEmptyStarters } from "./ChatEmptyStarters.js";
import { ChatPlanTodoChrome } from "./ChatPlanTodoChrome.js";
import { ChatRunStatusChrome } from "./ChatRunStatusChrome.js";
import { ChatAgentStatusPill } from "./ChatAgentStatusPill.js";
import { ChatRunDetailsChrome } from "./ChatRunDetailsChrome.js";
import { ChatCheckpointsChrome } from "./ChatCheckpointsChrome.js";
import { ChatComposerCompact } from "./ChatComposerCompact.js";
import { ChatComposerFollowup } from "./ChatComposerFollowup.js";
import { ChatComposerContext } from "./ChatComposerContext.js";
import {
  ChatComposerAtMention,
  type AtMentionHandle,
} from "./ChatComposerAtMention.js";
import {
  ChatComposerSlash,
  type SlashCommandHandle,
} from "./ChatComposerSlash.js";
import {
  ChatComposerSnippet,
  type SnippetHandle,
} from "./ChatComposerSnippet.js";
import {
  formatSlashHelpDigest,
  tryRunSlashCommand,
  type SlashCommandMeta,
  type SlashHostAction,
} from "./composerSlashCommands.js";
import {
  addPickedSnippet,
  composePromptWithSnippets,
  DEFAULT_SNIPPETS,
  insertSnippetHandle,
  mergeSnippetCatalogs,
  parseWorkspaceSnippetsJson,
  removePickedSnippet,
  type Snippet,
} from "./composerSnippets.js";
import {
  addContextItem,
  composeRunPrompt,
  newContextItemId,
  toContextChips,
  type ComposerContextItem,
} from "./composerContext.js";
import { pathToFileUri } from "./chatHref.js";
import {
  resolveComposerSubmitMode,
} from "./composerFollowupChrome.js";
import {
  runBlockedMessageFromEvent,
  runWarningMessageFromEvent,
} from "./chatRunChrome.js";
import { canShowRunDetailsChrome } from "./runDetailsChrome.js";
import {
  accumulateRunUsage,
  usageDeltaFromPayload,
  ZERO_RUN_USAGE,
  type RunUsageTotals,
} from "./usageMeterChrome.js";
import {
  applyInteractivePrompt,
  interactivePromptFromAgentEvent,
  type PendingClarificationPrompt,
  type PendingToolApproval,
} from "./interactivePrompt.js";
import {
  buildOpenOperationsPayload,
  parseOpenOperationsPayload,
} from "./operationsDeepLink.js";
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
  const [selectionAttach, setSelectionAttach] = useState<
    OpenChatWithSelectionPayload | undefined
  >(undefined);
  const [fileAttach, setFileAttach] = useState<
    OpenChatWithFilePayload | undefined
  >(undefined);
  const [attentionCount, setAttentionCount] = useState(0);
  const [runInspectorAvailable, setRunInspectorAvailable] = useState(false);
  const [runInspectorOpen, setRunInspectorOpen] = useState(false);
  const [runInspectorOpenRequest, setRunInspectorOpenRequest] = useState(0);

  const selectSurface = useCallback(
    (next: PersistedAltaiSurface) => {
      setSurface(next);
      patchPersistedState(client, { surface: next });
    },
    [client],
  );

  const onComposerDraftChange = useCallback(
    (draft: string) => {
      patchPersistedState(client, { composerDraft: draft });
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
      const next = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
      setAttentionCount(next);
      void client
        .request("operations.reportAttention", {
          params: { count: next },
        })
        .catch(() => {
          /* Status-bar badge is best-effort presentation. */
        });
    },
    [client],
  );

  const openOperationsSurface = useCallback(
    (input: {
      view: OperationsDeepLinkView;
      workHubView?: OperationsDeepLinkWorkHubView;
      composeTask?: boolean;
      composeAutomation?: boolean;
      draftTitle?: string;
    }) => {
      const payload = buildOpenOperationsPayload({
        view: input.view,
        ...(input.workHubView ? { workHubView: input.workHubView } : {}),
        ...(input.composeTask ? { composeTask: true } : {}),
        ...(input.composeAutomation ? { composeAutomation: true } : {}),
        ...(input.draftTitle?.trim()
          ? { draftTitle: input.draftTitle.trim() }
          : {}),
      });
      selectSurface("operations");
      setOperationsNav(payload);
      setOperationsView(payload.view as PersistedOperationsView);
      if (payload.workHubView) {
        setWorkHubView(payload.workHubView as PersistedWorkHubView);
      }
      patchPersistedState(client, {
        surface: "operations",
        operationsView: payload.view as PersistedOperationsView,
        ...(payload.workHubView
          ? { workHubView: payload.workHubView as PersistedWorkHubView }
          : {}),
      });
    },
    [client, selectSurface],
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

  useEffect(() => {
    return client.onEvent(OPEN_CHAT_WITH_SELECTION_EVENT, (payload) => {
      const parsed = parseOpenChatWithSelectionPayload(payload);
      if (!parsed) {
        return;
      }
      selectSurface("chat");
      setSelectionAttach(parsed);
      patchPersistedState(client, { surface: "chat" });
    });
  }, [client, selectSurface]);

  useEffect(() => {
    return client.onEvent(OPEN_CHAT_WITH_FILE_EVENT, (payload) => {
      const parsed = parseOpenChatWithFilePayload(payload);
      if (!parsed) {
        return;
      }
      selectSurface("chat");
      setFileAttach(parsed);
      patchPersistedState(client, { surface: "chat" });
    });
  }, [client, selectSurface]);

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
          actions={
            <ChatShellTopbar
              surface={surface}
              operationsView={operationsView}
              attentionCount={attentionCount}
              inspectorAvailable={runInspectorAvailable}
              inspectorOpen={runInspectorOpen}
              onOpenWork={() => {
                openOperationsSurface({
                  view: "work",
                  workHubView: "runs",
                });
              }}
              onOpenInbox={() => {
                openOperationsSurface({ view: "inbox" });
              }}
              onToggleInspector={() => {
                if (runInspectorOpen) {
                  setRunInspectorOpen(false);
                  return;
                }
                selectSurface("chat");
                setRunInspectorOpen(true);
                setRunInspectorOpenRequest((value) => value + 1);
              }}
            />
          }
        />
        <div
          className="altai-view-tabs"
          role="tablist"
          aria-label="ALTAI surfaces"
          onKeyDown={(event) => {
            if (
              event.key !== "ArrowLeft" &&
              event.key !== "ArrowRight" &&
              event.key !== "Home" &&
              event.key !== "End"
            ) {
              return;
            }
            event.preventDefault();
            const next = nextAltaiSurface(
              surface as AltaiSurfaceId,
              event.key,
              ALTAI_SURFACES,
            );
            selectSurface(next);
            const btn = document.getElementById(`altai-tab-${next}`);
            btn?.focus();
          }}
        >
          <button
            type="button"
            id="altai-tab-chat"
            role="tab"
            aria-selected={surface === "chat"}
            tabIndex={surface === "chat" ? 0 : -1}
            className="altai-view-tab"
            onClick={() => selectSurface("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            id="altai-tab-operations"
            role="tab"
            aria-selected={surface === "operations"}
            tabIndex={surface === "operations" ? 0 : -1}
            className="altai-view-tab"
            onClick={() => selectSurface("operations")}
          >
            Operations
          </button>
          <button
            type="button"
            id="altai-tab-settings"
            role="tab"
            aria-selected={surface === "settings"}
            tabIndex={surface === "settings" ? 0 : -1}
            className="altai-view-tab"
            onClick={() => selectSurface("settings")}
          >
            Settings
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
          ) : surface === "settings" ? (
            <>
              <OperationsAttentionReporter onCount={reportAttentionCount} />
              <ChatSettingsHub
                extensionVersion={hostStatus.extensionVersion}
                hostStatusLabel={hostStatus.status}
                diagnosticCode={hostStatus.diagnosticCode}
                requestWorkspace={(method, params) =>
                  transport.requestWorkspace(method, params)
                }
              />
            </>
          ) : (
            <>
              <OperationsAttentionReporter onCount={reportAttentionCount} />
              <AgentUiShell
                hostStatus={hostStatus}
                initError={initError}
                chatFocus={chatFocus}
                selectionAttach={selectionAttach}
                onSelectionAttachConsumed={() => {
                  setSelectionAttach(undefined);
                }}
                fileAttach={fileAttach}
                onFileAttachConsumed={() => {
                  setFileAttach(undefined);
                }}
                inspectorOpenRequest={runInspectorOpenRequest}
                onInspectorAvailabilityChange={setRunInspectorAvailable}
                onInspectorOpenChange={setRunInspectorOpen}
                onFocusChat={openChatFromOperations}
                onOpenOperations={openOperationsSurface}
                onOpenSettings={() => {
                  selectSurface("settings");
                }}
                requestWorkspace={(method, params) =>
                  transport.requestWorkspace(method, params)
                }
                initialComposerDraft={
                  client.getPersistedState().composerDraft ?? ""
                }
                onComposerDraftChange={onComposerDraftChange}
              />
            </>
          )
        ) : (
          <AgentUiShell
            hostStatus={hostStatus}
            initError={initError}
            chatFocus={chatFocus}
            selectionAttach={selectionAttach}
            onSelectionAttachConsumed={() => {
              setSelectionAttach(undefined);
            }}
            fileAttach={fileAttach}
            onFileAttachConsumed={() => {
              setFileAttach(undefined);
            }}
            inspectorOpenRequest={runInspectorOpenRequest}
            onInspectorAvailabilityChange={setRunInspectorAvailable}
            onInspectorOpenChange={setRunInspectorOpen}
            onFocusChat={openChatFromOperations}
            onOpenOperations={openOperationsSurface}
            onOpenSettings={() => {
              selectSurface("settings");
            }}
            requestWorkspace={(method, params) =>
              transport.requestWorkspace(method, params)
            }
            initialComposerDraft={
              client.getPersistedState().composerDraft ?? ""
            }
            onComposerDraftChange={onComposerDraftChange}
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
  selectionAttach,
  onSelectionAttachConsumed,
  fileAttach,
  onFileAttachConsumed,
  inspectorOpenRequest = 0,
  onInspectorAvailabilityChange,
  onInspectorOpenChange,
  onFocusChat,
  onOpenOperations,
  onOpenSettings,
  requestWorkspace,
  initialComposerDraft = "",
  onComposerDraftChange,
}: {
  hostStatus: HostStatusPayload;
  initError: string | null;
  chatFocus?: OpenChatFocus;
  selectionAttach?: OpenChatWithSelectionPayload;
  onSelectionAttachConsumed?: () => void;
  fileAttach?: OpenChatWithFilePayload;
  onFileAttachConsumed?: () => void;
  inspectorOpenRequest?: number;
  onInspectorAvailabilityChange?: (available: boolean) => void;
  onInspectorOpenChange?: (open: boolean) => void;
  onFocusChat: (input: { chatId?: string; label?: string }) => void;
  onOpenOperations?: (input: {
    view: OperationsDeepLinkView;
    workHubView?: OperationsDeepLinkWorkHubView;
    composeTask?: boolean;
    composeAutomation?: boolean;
    draftTitle?: string;
  }) => void;
  onOpenSettings?: () => void;
  requestWorkspace: (method: string, params?: unknown) => Promise<unknown>;
  /** Restored unsent composer text (presentation only). */
  initialComposerDraft?: string;
  onComposerDraftChange?: (draft: string) => void;
}) {
  const ports = useHostPorts();
  const canInitialize = useCapability("runtime.initialize");
  const canStartRun = useCapability("runtime.startRun");
  const canSteer = useCapability("runtime.steerRun");
  const canQueue = useCapability("runtime.queueRun");
  const canRetry = useCapability("runtime.retryRun");
  const canCancel = useCapability("runtime.cancelRun");
  const canCompact = useCapability("runtime.compactContext");
  const canCreateSession = useCapability("sessions.create");
  const canRenameSession = useCapability("sessions.rename");
  const canTruncate = useCapability("sessions.truncate");
  const canListSessions = useCapability("sessions.list");
  const canMessages = useCapability("sessions.messages");
  const canListModels = useCapability("models.list");
  const canSelectModel = useCapability("models.select");
  const canGetSettings = useCapability("settings.get");
  const canSetPermission = useCapability("interactive.permissionModes");
  const canWorkspaceInfo = useCapability("workspace.info");
  const canReadWorkspaceFile = useCapability("workspace.readFile");
  const canModelConfigRow = canMountModelPicker({
    list: canListModels,
    select: canSelectModel,
    settingsGet: canGetSettings,
  });
  const [prompt, setPromptState] = useState(() => initialComposerDraft);
  const setPrompt = useCallback(
    (next: string) => {
      setPromptState(next);
      onComposerDraftChange?.(next);
    },
    [onComposerDraftChange],
  );
  const [busy, setBusy] = useState(false);
  const [editingBusy, setEditingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [runBlockedMessage, setRunBlockedMessage] = useState<string | null>(
    null,
  );
  const [runWarningMessage, setRunWarningMessage] = useState<string | null>(
    null,
  );
  const [runDetailsDismissed, setRunDetailsDismissed] = useState(false);
  const [changeReviewOpen, setChangeReviewOpen] = useState(false);
  const [lastReplayRunId, setLastReplayRunId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [openTabs, setOpenTabs] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    () => chatFocus?.chatId ?? null,
  );
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runUsage, setRunUsage] = useState<RunUsageTotals>(ZERO_RUN_USAGE);
  const [sessionListKey, setSessionListKey] = useState(0);
  const [permissionMode, setPermissionMode] = useState<PermissionMode | null>(
    null,
  );
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [contextItems, setContextItems] = useState<ComposerContextItem[]>([]);
  const [snippetCatalog, setSnippetCatalog] = useState<Snippet[]>(() => [
    ...DEFAULT_SNIPPETS,
  ]);
  const [pickedSnippets, setPickedSnippets] = useState<Snippet[]>([]);
  const [cursor, setCursor] = useState(0);
  const atMentionRef = useRef<AtMentionHandle | null>(null);
  const slashRef = useRef<SlashCommandHandle | null>(null);
  const snippetRef = useRef<SnippetHandle | null>(null);
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

  // Built-in snippets + optional workspace `.altai/snippets.json`.
  useEffect(() => {
    if (!canWorkspaceInfo || !canReadWorkspaceFile) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const info = await ports.workspace.getWorkspace();
        const root = info.roots[0];
        if (!root || cancelled) {
          return;
        }
        const pathJoiner = root.includes("\\") ? "\\" : "/";
        const snipPath = `${root.replace(/[\\/]$/, "")}${pathJoiner}.altai${pathJoiner}snippets.json`;
        const fileUri = root.startsWith("file:")
          ? `${root.replace(/\/$/, "")}/.altai/snippets.json`
          : pathToFileUri(snipPath);
        const file = await ports.workspace.readFile(fileUri);
        if (cancelled) {
          return;
        }
        const workspaceSnips = parseWorkspaceSnippetsJson(file.text);
        if (workspaceSnips.length > 0) {
          setSnippetCatalog(
            mergeSnippetCatalogs(DEFAULT_SNIPPETS, workspaceSnips),
          );
        }
      } catch {
        // Missing file or no workspace is fine — keep defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ports, canWorkspaceInfo, canReadWorkspaceFile]);

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
      setRunUsage(ZERO_RUN_USAGE);
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

  const appliedSelectionKey = useRef<number | null>(null);
  useEffect(() => {
    if (!selectionAttach) {
      return;
    }
    if (appliedSelectionKey.current === selectionAttach.key) {
      return;
    }
    appliedSelectionKey.current = selectionAttach.key;
    setContextItems((prev) =>
      addContextItem(prev, {
        id: newContextItemId("selection"),
        kind: "selection",
        uri: selectionAttach.uri,
        path: selectionAttach.path,
        text: selectionAttach.text,
        lines: selectionAttach.lines,
      }),
    );
    setMessages((prev) =>
      appendMetaMessage(
        prev,
        `Attached editor selection · ${selectionAttach.path}`,
      ),
    );
    onSelectionAttachConsumed?.();
  }, [selectionAttach, onSelectionAttachConsumed]);

  const appliedFileKey = useRef<number | null>(null);
  useEffect(() => {
    if (!fileAttach) {
      return;
    }
    if (appliedFileKey.current === fileAttach.key) {
      return;
    }
    appliedFileKey.current = fileAttach.key;
    setContextItems((prev) =>
      addContextItem(prev, {
        id: newContextItemId("file"),
        kind: "file",
        uri: fileAttach.uri,
        name: fileAttach.name,
        path: fileAttach.path,
      }),
    );
    setMessages((prev) =>
      appendMetaMessage(prev, `Attached active file · ${fileAttach.path}`),
    );
    onFileAttachConsumed?.();
  }, [fileAttach, onFileAttachConsumed]);

  useEffect(() => {
    setRunDetailsDismissed(false);
  }, [activeRunId, runBlockedMessage, runWarningMessage]);

  useEffect(() => {
    if (activeRunId) {
      setLastReplayRunId(activeRunId);
    }
  }, [activeRunId]);

  useEffect(() => {
    if (inspectorOpenRequest > 0) {
      setRunDetailsDismissed(false);
    }
  }, [inspectorOpenRequest]);

  useEffect(() => {
    const available = canShowRunDetailsChrome({
      hasActiveRun: Boolean(activeRunId),
      blockedMessage: runBlockedMessage,
      warningMessage: runWarningMessage,
    });
    onInspectorAvailabilityChange?.(available);
  }, [
    activeRunId,
    runBlockedMessage,
    runWarningMessage,
    onInspectorAvailabilityChange,
  ]);

  useEffect(() => {
    return ports.events.subscribe((event) => {
      setMessages((prev) =>
        applyAgentEventToMessages(prev, event, {
          activeChatId: activeChatIdRef.current,
        }),
      );

      if (
        event.type === "usage" &&
        event.chatId &&
        event.chatId === activeChatIdRef.current
      ) {
        const delta = usageDeltaFromPayload(event.payload);
        if (delta) {
          setRunUsage((prev) => accumulateRunUsage(prev, delta));
        }
      }

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
          const blocked = runBlockedMessageFromEvent(event.payload);
          if (blocked) {
            setRunBlockedMessage(blocked);
            setRunWarningMessage(null);
          }
        }
      }

      const warning = runWarningMessageFromEvent(event.type, event.payload);
      if (warning !== null) {
        setRunWarningMessage(warning === "" ? null : warning);
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
    setRunBlockedMessage(null);
    setRunWarningMessage(null);
    setRunWarningMessage(null);
  }, [activeChatId]);

  const onSubmit = async (preferSteer = false): Promise<void> => {
    const text = prompt.trim();
    if (
      (!text && contextItems.length === 0 && pickedSnippets.length === 0) ||
      busy
    ) {
      return;
    }

    // Whole-line slash commands (no attachment payload required).
    if (text.startsWith("/") && contextItems.length === 0 && pickedSnippets.length === 0) {
      const outcome = tryRunSlashCommand(text);
      if (outcome.kind === "handled") {
        setBusy(true);
        setError(null);
        try {
          await dispatchSlashAction(outcome.action, outcome.tail, outcome.toast);
          setPrompt("");
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
        return;
      }
      if (outcome.kind === "send-prompt") {
        await submitExpandedPrompt(outcome.prompt, preferSteer);
        return;
      }
    }

    // Expand #snippet tokens (and picked chips) before context blocks.
    const withSnippets = composePromptWithSnippets(
      text,
      snippetCatalog,
      pickedSnippets,
    );
    const displayText =
      text ||
      (pickedSnippets.length > 0
        ? pickedSnippets.map((s) => `#${s.handle}`).join(" ")
        : undefined);
    await submitExpandedPrompt(
      withSnippets.prompt,
      preferSteer,
      displayText,
    );
  };

  const dispatchSlashAction = async (
    action: SlashHostAction,
    tail: string,
    toast?: string,
  ): Promise<void> => {
    switch (action) {
      case "new": {
        if (!canCreateSession) {
          throw new Error("Session create is unavailable on this host");
        }
        const session = await ports.sessions.createSession(
          tail.trim() || undefined,
        );
        setActiveChatId(session.id);
        setActiveRunId(null);
        setMessages([]);
        setRunUsage(ZERO_RUN_USAGE);
        rememberTab(session.id, session.title);
        setSessionListKey((key) => key + 1);
        onFocusChat({ chatId: session.id, label: session.title });
        break;
      }
      case "sessions":
        setSessionListKey((key) => key + 1);
        break;
      case "rename": {
        if (!tail.trim()) {
          setMessages((prev) =>
            appendMetaMessage(prev, "Usage: /rename <new title>"),
          );
          return;
        }
        if (!activeChatId || !canRenameSession) {
          throw new Error("Rename is unavailable on this host");
        }
        await ports.sessions.renameSession(activeChatId, tail.trim());
        rememberTab(activeChatId, tail.trim());
        setSessionListKey((key) => key + 1);
        break;
      }
      case "retry":
        await onRetry();
        return;
      case "stop":
        if (!canCancel) {
          throw new Error("Cancel is unavailable on this host");
        }
        await onCancel();
        return;
      case "compact": {
        if (!canCompact || !activeChatId) {
          throw new Error("Compact is unavailable on this host");
        }
        await ports.runtime.compactContext({
          chatId: activeChatId,
        });
        break;
      }
      case "status":
        setRunDetailsDismissed(false);
        onInspectorOpenChange?.(true);
        break;
      case "plan": {
        if (!canSetPermission) {
          throw new Error("Permission mode is unavailable on this host");
        }
        const next =
          tail === "off" || tail === "exit"
            ? "auto-edit"
            : permissionMode === "plan"
              ? "auto-edit"
              : "plan";
        const mode = await ports.settings.setPermissionMode(next);
        setPermissionMode(mode);
        break;
      }
      case "review":
        setChangeReviewOpen(true);
        break;
      case "tasks":
        onOpenOperations?.({ view: "work", workHubView: "runs" });
        break;
      case "new-task":
        onOpenOperations?.({
          view: "runs",
          workHubView: "runs",
          composeTask: true,
          ...(tail.trim() ? { draftTitle: tail.trim() } : {}),
        });
        break;
      case "inbox":
        onOpenOperations?.({ view: "inbox" });
        break;
      case "automations":
        onOpenOperations?.({ view: "work", workHubView: "scheduled" });
        break;
      case "new-automation":
        onOpenOperations?.({
          view: "work",
          workHubView: "scheduled",
          composeAutomation: true,
          ...(tail.trim() ? { draftTitle: tail.trim() } : {}),
        });
        break;
      case "models":
      case "permissions":
      case "mcp":
      case "skills":
      case "settings":
        onOpenSettings?.();
        break;
      case "help": {
        const digest = formatSlashHelpDigest(tail);
        setMessages((prev) => appendMetaMessage(prev, digest));
        return;
      }
      case "logs":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.openLogs",
        });
        break;
      case "diagnostics":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.runDiagnostics",
        });
        break;
      case "restart-host":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.restartAgentHost",
        });
        break;
      case "version":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.showVersionCompatibility",
        });
        break;
      default:
        break;
    }
    if (toast) {
      setMessages((prev) => appendMetaMessage(prev, toast));
    }
  };

  const submitExpandedPrompt = async (
    text: string,
    preferSteer: boolean,
    displayText?: string,
  ): Promise<void> => {
    if ((!text && contextItems.length === 0) || busy) {
      return;
    }
    const shown = (displayText ?? text).trim() || text.trim();
    const mode = resolveComposerSubmitMode({
      hasActiveRun: Boolean(activeRunId && activeChatId),
      canStartRun,
      canSteer,
      canQueue,
      hasPrompt: Boolean(text || contextItems.length > 0),
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

    // Steer has no attachment protocol in this slice — require a text prompt.
    if (mode === "steer" && !text) {
      return;
    }

    setBusy(true);
    setError(null);
    setRunBlockedMessage(null);
    setRunWarningMessage(null);
    try {
      if (mode === "steer" && activeChatId && activeRunId) {
        await ports.runtime.steerRun({
          chatId: activeChatId,
          runId: activeRunId,
          prompt: text,
        });
        setMessages((prev) => appendUserMessage(prev, shown));
        setMessages((prev) => appendMetaMessage(prev, "Steer sent"));
        setPrompt("");
        setPickedSnippets([]);
        return;
      }

      const composed = composeRunPrompt(
        text || "Please review the attached context.",
        contextItems,
      );
      const chips = toContextChips(contextItems);
      const runModelId = modelIdForStartRun(selectedModelId);
      const ref = await ports.runtime.startRun({
        prompt: composed.prompt,
        ...(activeChatId ? { chatId: activeChatId } : {}),
        ...(permissionMode ? { permissionMode } : {}),
        ...(runModelId ? { modelId: runModelId } : {}),
        ...(mode === "queue" ? { queue: true } : {}),
        ...(composed.attachments.length > 0
          ? { attachments: composed.attachments }
          : {}),
      });
      setActiveChatId(ref.chatId);
      if (mode !== "queue") {
        setActiveRunId(ref.runId);
        setRunUsage(ZERO_RUN_USAGE);
      }
      rememberTab(ref.chatId);
      setMessages((prev) =>
        appendUserMessage(
          prev,
          shown || "Please review the attached context.",
          {
            chips,
          },
        ),
      );
      if (mode === "queue") {
        setMessages((prev) => appendMetaMessage(prev, "Queued next run"));
      }
      setPrompt("");
      setContextItems([]);
      setPickedSnippets([]);
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

  const onEditUserMessage = async (
    messageId: string,
    nextContent: string,
  ): Promise<void> => {
    const text = nextContent.trim();
    const turn = parseUserTurnId(messageId);
    if (
      !text ||
      turn === null ||
      turn < 1 ||
      !activeChatId ||
      !canTruncate ||
      !canStartRun
    ) {
      return;
    }
    const boundary = truncateBoundaryForEdit(turn);
    if (boundary === null) {
      return;
    }
    setEditingBusy(true);
    setError(null);
    setRunBlockedMessage(null);
    setRunWarningMessage(null);
    try {
      if (activeRunId) {
        await ports.runtime.cancelRun({
          chatId: activeChatId,
          runId: activeRunId,
        });
        setActiveRunId(null);
      }
      await ports.sessions.truncateSession(activeChatId, boundary);
      setMessages((prev) =>
        withStableUserTurnIds(truncateDisplayAfterUserTurn(prev, turn)),
      );
      const editModelId = modelIdForStartRun(selectedModelId);
      const ref = await ports.runtime.startRun({
        prompt: text,
        chatId: activeChatId,
        ...(permissionMode ? { permissionMode } : {}),
        ...(editModelId ? { modelId: editModelId } : {}),
      });
      setActiveChatId(ref.chatId);
      setActiveRunId(ref.runId);
      setRunUsage(ZERO_RUN_USAGE);
      setMessages((prev) => appendUserMessage(prev, text));
      setSessionListKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditingBusy(false);
    }
  };

  const onRetry = async (): Promise<void> => {
    if (!activeChatId || !canRetry) {
      return;
    }
    setBusy(true);
    setError(null);
    setRunBlockedMessage(null);
    setRunWarningMessage(null);
    try {
      const ref = await ports.runtime.retryRun({
        chatId: activeChatId,
        ...(activeRunId ? { runId: activeRunId } : {}),
      });
      setActiveRunId(ref.runId);
      setRunUsage(ZERO_RUN_USAGE);
      setMessages((prev) => appendMetaMessage(prev, "Retrying…"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (initError || hostStatus.status !== "ready") {
    const recovery = recoveryHintForDiagnosticCode(hostStatus.diagnosticCode);
    const description = [
      initError ?? hostStatus.message,
      recovery ? `Recovery: ${recovery}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    const clipboardText = formatDiagnosticClipboardText({
      diagnosticCode: hostStatus.diagnosticCode,
      message: initError ?? hostStatus.message,
      recoveryHint: recovery,
    });
    return (
      <main className="altai-shell-body">
        <SurfaceEmptyState
          title={
            initError
              ? "Shared UI failed to initialize"
              : "Waiting for agent host"
          }
          description={description}
        />
        {hostStatus.diagnosticCode ? (
          <p
            className="altai-shell-meta"
            style={{ padding: "0 1rem 0.75rem" }}
            role="status"
          >
            Diagnostic · {hostStatus.diagnosticCode}
          </p>
        ) : null}
        <div
          className="altai-ops-create-bar"
          style={{ padding: "0 1rem 0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
        >
          {clipboardText ? (
            <SurfaceSecondaryAction
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(clipboardText).catch(() => {
                  /* clipboard may be denied in some hosts */
                });
              }}
            >
              Copy diagnostic
            </SurfaceSecondaryAction>
          ) : null}
          {listRecoveryActions({
            diagnosticCode: hostStatus.diagnosticCode,
          }).map((action) => (
            <SurfaceSecondaryAction
              key={action.command}
              type="button"
              onClick={() => {
                void requestWorkspace("executeAltaiCommand", {
                  command: action.command,
                }).catch(() => {
                  /* allowlisted; failures surface in Extension Host */
                });
              }}
            >
              {action.label}
            </SurfaceSecondaryAction>
          ))}
        </div>
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
  const allowUserEdit = canEditUserMessage({
    role: "user",
    canTruncate,
    canStartRun,
    runActive: Boolean(activeRunId),
  });

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
          <ChatPlanTodoChrome
            permissionMode={permissionMode}
            messages={messages}
            onModeChange={setPermissionMode}
            onOpenFileError={(message) => {
              setError(message);
            }}
          />
          {!runDetailsDismissed &&
          canShowRunDetailsChrome({
            hasActiveRun: Boolean(activeRunId),
            blockedMessage: runBlockedMessage,
            warningMessage: runWarningMessage,
          }) ? (
            <ChatRunDetailsChrome
              messages={messages}
              chatId={activeChatId}
              hasActiveRun={Boolean(activeRunId)}
              busy={busy || editingBusy}
              approvalsPending={
                pendingApprovals.length + (pendingClarification ? 1 : 0)
              }
              approvals={pendingApprovals}
              onApprovalsChange={setPendingApprovals}
              blockedMessage={runBlockedMessage}
              warningMessage={runWarningMessage}
              totalTokens={runUsage.totalTokens}
              runUsage={runUsage}
              onStop={() => {
                void onCancel();
              }}
              onClose={() => {
                setRunDetailsDismissed(true);
                onInspectorOpenChange?.(false);
              }}
              onOpenChangeReview={() => {
                setChangeReviewOpen(true);
              }}
            />
          ) : (
            <ChatAgentStatusPill
              messages={messages}
              hasActiveRun={Boolean(activeRunId)}
              busy={busy || editingBusy}
              approvalsPending={
                pendingApprovals.length + (pendingClarification ? 1 : 0)
              }
              blockedMessage={runBlockedMessage}
              warningMessage={runWarningMessage}
            />
          )}
          {changeReviewOpen ? (
            <ChatChangeReviewPanel
              open={changeReviewOpen}
              messages={messages}
              onClose={() => {
                setChangeReviewOpen(false);
              }}
              onOpenFileError={(message) => {
                setError(message);
              }}
            />
          ) : null}
          <div className="altai-chat-scroll">
            {showEmptyHome ? (
              <>
                <EmptyState agentName="ALTAI" />
                <ChatEmptyStarters
                  emptyHome
                  onSelect={(value) => {
                    const trimmed = value.trim();
                    if (trimmed.startsWith("/")) {
                      const outcome = tryRunSlashCommand(trimmed);
                      if (outcome.kind === "handled") {
                        void dispatchSlashAction(
                          outcome.action,
                          outcome.tail,
                          outcome.toast,
                        );
                        setPrompt("");
                        return;
                      }
                      if (outcome.kind === "send-prompt") {
                        void submitExpandedPrompt(outcome.prompt, false);
                        return;
                      }
                    }
                    setPrompt(value);
                    setCursor(value.length);
                  }}
                />
              </>
            ) : (
              <>
                <div
                  className="altai-chat-export"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    padding: "0.25rem 0.75rem 0",
                  }}
                >
                  <button
                    type="button"
                    className="altai-composer-stop"
                    title="Copy the full transcript as plain text"
                    onClick={() => {
                      const text = formatTranscriptForCopy(messages);
                      if (!text) {
                        return;
                      }
                      void (async () => {
                        try {
                          await navigator.clipboard.writeText(text);
                          setCopiedTranscript(true);
                          window.setTimeout(() => {
                            setCopiedTranscript(false);
                          }, 1500);
                        } catch (err: unknown) {
                          setError(
                            err instanceof Error ? err.message : String(err),
                          );
                        }
                      })();
                    }}
                  >
                    {copiedTranscript ? "Copied chat" : "Copy chat"}
                  </button>
                </div>
                <ChatMessageList
                  messages={messages}
                  canEditUserMessages={allowUserEdit}
                  onEditUserMessage={(messageId, next) => {
                    void onEditUserMessage(messageId, next);
                  }}
                  canRetry={canRetry && Boolean(activeChatId)}
                  onRetry={() => {
                    void onRetry();
                  }}
                  editingBusy={editingBusy || busy}
                  onOpenFileError={(message) => {
                    setError(message);
                  }}
                  requestWorkspace={requestWorkspace}
                />
              </>
            )}
            {error ? (
              <div
                className="altai-chat-error"
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  justifyContent: "space-between",
                }}
              >
                <p style={{ margin: 0, flex: 1 }}>{error}</p>
                <SurfaceSecondaryAction
                  type="button"
                  onClick={() => {
                    setError(null);
                  }}
                >
                  Dismiss
                </SurfaceSecondaryAction>
              </div>
            ) : null}
            <ChatRunStatusChrome
              messages={messages}
              runBlockedMessage={runBlockedMessage}
              runWarningMessage={runWarningMessage}
              canRetry={canRetry && Boolean(activeChatId)}
              canSteer={canSteer && Boolean(activeRunId)}
              hasActiveRun={Boolean(activeRunId)}
              onDismissBlocked={() => {
                setRunBlockedMessage(null);
              }}
              onDismissWarning={() => {
                setRunWarningMessage(null);
              }}
              onRetry={() => {
                void onRetry();
              }}
              onSteer={() => {
                void onSubmit(true);
              }}
              onStop={() => {
                void onCancel();
              }}
              onOpenFileError={(message) => {
                setError(message);
              }}
              onOpenChangeReview={() => {
                setChangeReviewOpen(true);
              }}
            />
            <ChatInteractivePrompts
              approvals={pendingApprovals}
              clarification={pendingClarification}
              onApprovalsChange={setPendingApprovals}
              onClarificationChange={setPendingClarification}
            />
          </div>
          <div className="altai-chat-composer-dock">
            <ChatProviderConnectBanner />
            <ChatProjectTargetChrome requestWorkspace={requestWorkspace} />
            <form
              className="altai-chat-composer-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <ComposerShell busy={busy}>
                <div className="px-2.5 pt-2">
                  <ChatComposerContext
                    items={contextItems}
                    onChange={setContextItems}
                    snippets={pickedSnippets}
                    onRemoveSnippet={(id) => {
                      setPickedSnippets((prev) =>
                        removePickedSnippet(prev, id),
                      );
                    }}
                    disabled={busy}
                  />
                  <ChatComposerAtMention
                    prompt={prompt}
                    cursor={cursor}
                    items={contextItems}
                    onChangePrompt={setPrompt}
                    onChangeItems={setContextItems}
                    disabled={busy}
                    handleRef={atMentionRef}
                  />
                  <ChatComposerSlash
                    prompt={prompt}
                    cursor={cursor}
                    disabled={busy}
                    handleRef={slashRef}
                    onPickCommand={(command: SlashCommandMeta) => {
                      const next = `/${command.name} `;
                      setPrompt(next);
                      setCursor(next.length);
                    }}
                  />
                  <ChatComposerSnippet
                    prompt={prompt}
                    cursor={cursor}
                    catalog={snippetCatalog}
                    disabled={busy}
                    handleRef={snippetRef}
                    onPickSnippet={(snippet: Snippet) => {
                      const trigger = detectSlashOrSnippetTrigger(
                        prompt,
                        cursor,
                      );
                      if (trigger && trigger.prefix === "#") {
                        const next = insertSnippetHandle(
                          prompt,
                          trigger,
                          snippet.handle,
                        );
                        setPrompt(next);
                        setCursor(trigger.start + snippet.handle.length + 2);
                      } else {
                        const next =
                          prompt.trimEnd().length > 0
                            ? `${prompt.trimEnd()} #${snippet.handle} `
                            : `#${snippet.handle} `;
                        setPrompt(next);
                        setCursor(next.length);
                      }
                      setPickedSnippets((prev) =>
                        addPickedSnippet(prev, snippet),
                      );
                    }}
                  />
                  <ComposerTextArea
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      setCursor(event.target.selectionStart ?? 0);
                    }}
                    onSelect={(event) => {
                      setCursor(
                        (event.target as HTMLTextAreaElement).selectionStart ??
                          0,
                      );
                    }}
                    onClick={(event) => {
                      setCursor(
                        (event.target as HTMLTextAreaElement).selectionStart ??
                          0,
                      );
                    }}
                    onKeyUp={(event) => {
                      setCursor(
                        (event.target as HTMLTextAreaElement).selectionStart ??
                          0,
                      );
                    }}
                    placeholder={
                      activeRunId
                        ? canQueue || canSteer
                          ? "Follow up — Enter queues · ⌘/Ctrl+Enter steers"
                          : "Describe what should change…"
                        : canStartRun
                          ? "Describe what should change… / commands · # snippets · @ files"
                          : "Start run capability unavailable"
                    }
                    disabled={
                      busy ||
                      (!canStartRun &&
                        !(activeRunId && (canSteer || canQueue)))
                    }
                    rows={2}
                    onKeyDown={(event) => {
                      if (snippetRef.current?.isOpen()) {
                        if (snippetRef.current.handleKeyDown(event.key)) {
                          event.preventDefault();
                          return;
                        }
                      }
                      if (slashRef.current?.isOpen()) {
                        if (slashRef.current.handleKeyDown(event.key)) {
                          event.preventDefault();
                          return;
                        }
                      }
                      if (atMentionRef.current?.isOpen()) {
                        if (
                          atMentionRef.current.handleKeyDown(event.key)
                        ) {
                          event.preventDefault();
                          return;
                        }
                      }
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
                  hasPrompt={Boolean(
                    prompt.trim() ||
                      contextItems.length > 0 ||
                      pickedSnippets.length > 0,
                  )}
                  onSteer={() => void onSubmit(true)}
                  onQueue={() => void onSubmit(false)}
                />
                {canModelConfigRow ? (
                  <ComposerConfigRow
                    modelSlot={
                      <ChatModelPickerChrome
                        onModelChange={setSelectedModelId}
                      />
                    }
                  />
                ) : null}
                <ComposerPrimaryRow
                  tools={
                    <>
                      <ChatComposerCompact
                        chatId={activeChatId}
                        composerBusy={busy}
                        onCompacted={() => {
                          setMessages((prev) =>
                            appendMetaMessage(
                              prev,
                              "Context compaction requested",
                            ),
                          );
                        }}
                        onError={(message) => {
                          setError(message);
                        }}
                      />
                      <ChatCheckpointsChrome
                        chatId={activeChatId}
                        onRestored={() => {
                          setMessages((prev) =>
                            appendMetaMessage(
                              prev,
                              "Checkpoint restore requested",
                            ),
                          );
                        }}
                        onError={(message) => {
                          setError(message);
                        }}
                      />
                      <ChatReplayChrome
                        chatId={activeChatId}
                        runId={activeRunId ?? lastReplayRunId}
                        disabled={busy}
                        onReplayEvents={(count) => {
                          setMessages((prev) =>
                            appendMetaMessage(
                              prev,
                              `Replayed ${count} host event${count === 1 ? "" : "s"}`,
                            ),
                          );
                        }}
                        onError={(message) => {
                          setError(message);
                        }}
                      />
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
                          (!prompt.trim() && contextItems.length === 0) ||
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
            <ChatMcpStatusChrome />
            <ChatSkillsStatusChrome />
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
