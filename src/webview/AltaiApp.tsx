import {
  AgentChatLayout,
  AiChatMainColumn,
  AiSidePanelFrame,
  AiPanelSurfaceTabs,
  AiChatTranscriptFrame,
  ChatTabStrip,
  detectSlashOrSnippetTrigger,
  formatHostUserError,
  EmptyState,
  HostPortsProvider,
  SurfaceEmptyState,
  SurfaceSecondaryAction,
  useCapability,
  useHostPorts,
  type Capabilities,
  type OperationsView,
  type WorkHubView,
} from "@altai/agent-ui";
import { AiComposer } from "./AiComposer.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HOST_RPC_NOTIFICATION_EVENT,
  HOST_STATUS_EVENT,
  OPEN_CHAT_WITH_SELECTION_EVENT,
  OPEN_CHAT_WITH_FILE_EVENT,
  OPEN_OPERATIONS_EVENT,
  OPEN_SETTINGS_EVENT,
  type HostRpcNotificationPayload,
  type HostStatusPayload,
  type OpenOperationsPayload,
  type OperationsDeepLinkView,
  type OperationsDeepLinkWorkHubView,
} from "../shared/messages.js";
import {
  COMPOSER_DRAFT_DEBOUNCE_MS,
  mergePersistedWebviewState,
  parseOpenChatWithFilePayload,
  parseOpenChatWithSelectionPayload,
  parseOpenSettingsPayload,
  parsePersistedWebviewState,
  parseNativeMethodList,
  recoveryHintForDiagnosticCode,
  shouldPersistComposerDraftImmediately,
  shouldShowHostSubtitle,
  type OpenChatWithFilePayload,
  type OpenChatWithSelectionPayload,
  type PersistedAltaiSurface,
  type PersistedOperationsView,
  type PersistedWebviewState,
  type PersistedWorkHubView,
} from "@altai/agent-ui";
import { createComposerDraftPersistence } from "./composerDraftPersistence.js";
import { listRecoveryActions } from "./hostRecoveryActions.js";
import { formatDiagnosticClipboardText } from "./waitShellChrome.js";
import { isEscapeDismissKey } from "./chatKeyboardChrome.js";
import { OperationsPanel } from "./OperationsPanel.js";
import { OperationsAttentionReporter } from "./OperationsAttentionReporter.js";
import { ChatSettingsHub } from "./ChatSettingsHub.js";
import { shouldShowSurfaceTextTabs } from "./shellChrome.js";
import { ChatShellChrome } from "./ChatShellChrome.js";
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
import { ChatAgentPickerChrome } from "./ChatAgentPickerChrome.js";
import {
  applyAgentPromptPrefix,
  DEFAULT_COMPOSER_AGENT_ID,
  resolveComposerAgent,
} from "./agentPickerChrome.js";
import {
  canMountModelPicker,
  modelIdForStartRun,
} from "./modelPickerChrome.js";
import { ChatInteractivePrompts } from "./ChatInteractivePrompts.js";
import { ChatProviderConnectBanner } from "./ChatProviderConnectBanner.js";
import { ChatChangeReviewPanel } from "./ChatChangeReviewPanel.js";
import { ChatReplayChrome } from "./ChatReplayChrome.js";
import { ChatPlanTodoChrome } from "./ChatPlanTodoChrome.js";
import { ChatRunStatusChrome } from "./ChatRunStatusChrome.js";
import { ChatAgentStatusPill } from "./ChatAgentStatusPill.js";
import { ChatRunDetailsChrome } from "./ChatRunDetailsChrome.js";
import { ChatCheckpointsChrome } from "./ChatCheckpointsChrome.js";
import { ChatComposerCompact } from "./ChatComposerCompact.js";
import { ChatComposerFollowup } from "./ChatComposerFollowup.js";
import { ChatComposerContext } from "./ChatComposerContext.js";
import { useExtensionPreferences } from "./useExtensionPreferences.js";
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
import { applyComposerSlashOutcome } from "./composerDraft.js";
import { parseSnippetsJson } from "@altai/agent-ui";
import { mergeSnippetCatalog } from "./settingsSnippetsChrome.js";
import {
  addContextItem,
  composeRunPrompt,
  newContextItemId,
  toContextChips,
  toRunAttachments,
  type ComposerContextItem,
} from "./composerContext.js";
import {
  buildDiffContextItem,
  buildFileContextItem,
  buildSelectionContextItem,
  buildTerminalContextItem,
} from "./composerAttachChrome.js";
import { pathToFileUri } from "./chatHref.js";
import {
  resolveComposerSubmitMode,
} from "./composerFollowupChrome.js";
import { advanceCaretAfterDraftChange } from "./composerCaretChrome.js";
import {
  canEnableComposerSend,
  canEnableComposerStop,
  composerSubmitChromeMode,
} from "./composerSubmitChrome.js";
import { executeComposerSubmit } from "./composerSubmitExecute.js";
import {
  composerAvailabilityForFollowupMode,
  draftValueForComposerSubmit,
  followupModeToComposerAction,
} from "./vscodeComposerSubmit.js";
import { hasComposerDraft } from "@altai/agent-ui";
import { ArrowUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
    () => persisted.operationsView ?? "work",
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
  const [settingsSection, setSettingsSection] = useState(
    () => persisted.settingsSection ?? "",
  );
  const [settingsFocusKey, setSettingsFocusKey] = useState(0);
  const [settingsFocusSection, setSettingsFocusSection] = useState<
    string | undefined
  >(undefined);

  const extensionPrefsApi = useExtensionPreferences((method, params) =>
    transport.requestWorkspace(method, params),
  );
  const extensionPrefs = extensionPrefsApi.prefs;

  useEffect(() => {
    if (!extensionPrefsApi.ready) {
      return;
    }
    const root = document.getElementById("root");
    if (!root) {
      return;
    }
    root.dataset.altaiReduceMotion = extensionPrefs.reduceMotion;
    root.dataset.altaiHighContrast = extensionPrefs.highContrast ? "1" : "0";
    root.dataset.altaiLargerText = extensionPrefs.largerText ? "1" : "0";
    root.dataset.altaiUnderlineLinks = extensionPrefs.underlineLinks
      ? "1"
      : "0";
    root.dataset.altaiFocusRing = extensionPrefs.focusRing;
  }, [
    extensionPrefsApi.ready,
    extensionPrefs.reduceMotion,
    extensionPrefs.highContrast,
    extensionPrefs.largerText,
    extensionPrefs.underlineLinks,
    extensionPrefs.focusRing,
  ]);

  const selectSurface = useCallback(
    (next: PersistedAltaiSurface) => {
      setSurface(next);
      patchPersistedState(client, { surface: next });
    },
    [client],
  );

  const persistComposerDraft = useCallback(
    (draft: string) => {
      patchPersistedState(client, { composerDraft: draft });
    },
    [client],
  );
  const composerDraftPersistence = useMemo(
    () =>
      createComposerDraftPersistence(
        persistComposerDraft,
        {
          setTimeout: (fn, ms) => window.setTimeout(fn, ms),
          clearTimeout: (id) => {
            window.clearTimeout(id);
          },
        },
        {
          debounceMs: COMPOSER_DRAFT_DEBOUNCE_MS,
          shouldPersistImmediately: shouldPersistComposerDraftImmediately,
        },
      ),
    [persistComposerDraft],
  );

  useEffect(() => {
    return () => {
      composerDraftPersistence.flush();
    };
  }, [composerDraftPersistence]);

  const onComposerDraftChange = composerDraftPersistence.onChange;


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
          setInitError(
            formatHostUserError(
              error instanceof Error
                ? error
                : new Error("Runtime initialize failed"),
            ),
          );
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
        const methods = parseNativeMethodList(result);
        if (methods) {
          setNativeCapabilities(methods);
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
    return client.onEvent(OPEN_SETTINGS_EVENT, (payload) => {
      const parsed = parseOpenSettingsPayload(payload);
      if (!parsed) {
        return;
      }
      selectSurface("settings");
      setSettingsFocusKey(parsed.key);
      setSettingsFocusSection(parsed.section);
      if (parsed.section) {
        setSettingsSection(parsed.section);
        patchPersistedState(client, {
          surface: "settings",
          settingsSection: parsed.section,
        });
      } else {
        patchPersistedState(client, { surface: "settings" });
      }
    });
  }, [client, selectSurface]);

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
      <AiSidePanelFrame
        className="altai-shell altai-shell-root"
        variant="sidebar"
        topbar={
          <ChatShellChrome
            surface={surface}
            operationsView={operationsView}
            attentionCount={attentionCount}
            hostStatus={hostStatus.status}
            hostMessage={
              shouldShowHostSubtitle(hostStatus.status, hostStatus.message)
                ? hostStatus.message
                : undefined
            }
            inspectorAvailable={runInspectorAvailable}
            inspectorOpen={runInspectorOpen}
            onSelectSurface={(next) => {
              selectSurface(next);
            }}
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
      >
        {shouldShowSurfaceTextTabs() ? (
          <AiPanelSurfaceTabs
            activeId={surface}
            aria-label="ALTAI surfaces"
            tabs={[
              { id: "chat", label: "Chat" },
              { id: "operations", label: "Operations" },
              { id: "settings", label: "Settings" },
            ]}
            onSelect={(next) => {
              selectSurface(next as PersistedAltaiSurface);
            }}
          />
        ) : null}
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
                hostMessage={hostStatus.message}
                requestWorkspace={(method, params) =>
                  transport.requestWorkspace(method, params)
                }
                initialSection={settingsSection || undefined}
                onSectionChange={(section) => {
                  setSettingsSection(section);
                  patchPersistedState(client, { settingsSection: section });
                }}
                focusSection={settingsFocusSection}
                focusKey={settingsFocusKey}
                activeChatId={chatFocus?.chatId ?? null}
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
                initialAgentId={
                  client.getPersistedState().activeAgentId ??
                  DEFAULT_COMPOSER_AGENT_ID
                }
                onAgentIdChange={(agentId) => {
                  patchPersistedState(client, { activeAgentId: agentId });
                }}
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
            initialAgentId={
              client.getPersistedState().activeAgentId ??
              DEFAULT_COMPOSER_AGENT_ID
            }
            onAgentIdChange={(agentId) => {
              patchPersistedState(client, { activeAgentId: agentId });
            }}
          />
        )}
      </AiSidePanelFrame>
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
  initialAgentId = DEFAULT_COMPOSER_AGENT_ID,
  onAgentIdChange,
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
  initialAgentId?: string;
  onAgentIdChange?: (agentId: string) => void;
}) {
  const ports = useHostPorts();
  const extensionPrefsApi = useExtensionPreferences(requestWorkspace);
  const extensionPrefs = extensionPrefsApi.prefs;
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
  const canGitDiff = useCapability("workspace.gitDiff");
  const canTerminal = useCapability("workspace.terminalContext");
  const canActiveFile = useCapability("workspace.activeFile");
  const canSelection = useCapability("workspace.selection");
  const canModelConfigRow = canMountModelPicker({
    list: canListModels,
    select: canSelectModel,
    settingsGet: canGetSettings,
  });
  const [prompt, setPromptState] = useState(() => initialComposerDraft);
  const [cursor, setCursor] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState(
    () => resolveComposerAgent(initialAgentId).id,
  );
  const setPrompt = useCallback(
    (next: string) => {
      setPromptState(next);
      onComposerDraftChange?.(next);
      if (next.length === 0) {
        setCursor(0);
      }
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

  useEffect(() => {
    if (!extensionPrefs.autoFocusComposer) {
      return;
    }
    if (hostStatus.status !== "ready") {
      return;
    }
    const timer = window.setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        "textarea.altai-composer-input, .altai-ai-composer textarea, form.altai-ai-composer textarea",
      );
      textarea?.focus();
    }, 80);
    return () => {
      window.clearTimeout(timer);
    };
  }, [extensionPrefs.autoFocusComposer, hostStatus.status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEscapeDismissKey(event)) {
        return;
      }
      if (error || runBlockedMessage || runWarningMessage) {
        setError(null);
        setRunBlockedMessage(null);
        setRunWarningMessage(null);
        return;
      }
      if (changeReviewOpen) {
        setChangeReviewOpen(false);
        return;
      }
      if (!runDetailsDismissed) {
        setRunDetailsDismissed(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    error,
    runBlockedMessage,
    runWarningMessage,
    changeReviewOpen,
    runDetailsDismissed,
  ]);
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

  // Settings #snippets + optional workspace `.altai/snippets.json` over defaults.
  useEffect(() => {
    if (!extensionPrefsApi.ready) {
      return;
    }
    let cancelled = false;
    const fromPrefs = mergeSnippetCatalog(
      parseSnippetsJson(extensionPrefs.snippetsJson),
    );
    setSnippetCatalog(fromPrefs);

    if (!canWorkspaceInfo || !canReadWorkspaceFile) {
      return () => {
        cancelled = true;
      };
    }
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
          setSnippetCatalog(mergeSnippetCatalogs(fromPrefs, workspaceSnips));
        }
      } catch {
        // Missing file or no workspace is fine — keep prefs/defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    ports,
    canWorkspaceInfo,
    canReadWorkspaceFile,
    extensionPrefsApi.ready,
    extensionPrefs.snippetsJson,
  ]);

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
    const hasBody =
      Boolean(text) ||
      contextItems.length > 0 ||
      pickedSnippets.length > 0;
    if (!hasBody || busy) {
      return;
    }

    // Whole-line slash host actions stay host-local (async side effects).
    let baseText = text;
    if (
      text.startsWith("/") &&
      contextItems.length === 0 &&
      pickedSnippets.length === 0
    ) {
      const outcome = tryRunSlashCommand(text);
      if (outcome.kind === "handled") {
        setBusy(true);
        setError(null);
        try {
          await dispatchSlashAction(
            outcome.action,
            outcome.tail,
            outcome.toast,
          );
          setPrompt("");
        } catch (err) {
          setError(formatHostUserError(err));
        } finally {
          setBusy(false);
        }
        return;
      }
      if (outcome.kind === "send-prompt") {
        const mapped = applyComposerSlashOutcome(outcome, text);
        baseText = [mapped.commandMarker, mapped.effectiveText]
          .filter(Boolean)
          .join("\n\n");
      }
    }

    const mode = resolveComposerSubmitMode({
      hasActiveRun: Boolean(activeRunId && activeChatId),
      canStartRun,
      canSteer,
      canQueue,
      hasPrompt: hasBody,
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
    if (mode === "steer" && !baseText.trim() && !text) {
      return;
    }

    const withSnippets = composePromptWithSnippets(
      baseText,
      snippetCatalog,
      pickedSnippets,
    );
    const displayText =
      text ||
      (pickedSnippets.length > 0
        ? pickedSnippets.map((s) => `#${s.handle}`).join(" ")
        : undefined);

    const agent = resolveComposerAgent(selectedAgentId);
    let draftValue: string;
    let runAttachments = toRunAttachments(contextItems);
    if (mode === "steer") {
      // Steer sends wire text only (no context/agent prefix; mirrors prior host).
      draftValue = withSnippets.prompt.trim() || baseText.trim();
      if (!draftValue) {
        return;
      }
      runAttachments = [];
    } else {
      const bodyForRun =
        withSnippets.prompt.trim() ||
        draftValueForComposerSubmit({
          text: baseText,
          contextItems,
          snippetCount: pickedSnippets.length,
        });
      const hostBody = applyAgentPromptPrefix(bodyForRun, agent);
      const composed = composeRunPrompt(
        hostBody || "Please review the attached context.",
        contextItems,
      );
      draftValue = composed.prompt;
      runAttachments = composed.attachments;
    }

    const action = followupModeToComposerAction(mode);
    const draft = {
      value: draftValue,
      files: [] as const,
      snippets: [] as const,
      commands: [] as const,
    };
    if (!hasComposerDraft(draft)) {
      return;
    }
    const availability = composerAvailabilityForFollowupMode(mode, {
      hasDraft: true,
      runId: activeRunId,
      submitting: false,
    });

    setBusy(true);
    setError(null);
    setRunBlockedMessage(null);
    setRunWarningMessage(null);
    try {
      const result = await executeComposerSubmit({
        action,
        availability,
        draft,
        catalog: [],
        sessionId: activeChatId,
        runId: activeRunId,
        host: {
          onError: ({ error }) => {
            setError(formatHostUserError(error));
          },
          steer: async ({ composed }) => {
            if (!activeChatId || !activeRunId) {
              return false;
            }
            await ports.runtime.steerRun({
              chatId: activeChatId,
              runId: activeRunId,
              prompt: composed,
            });
            const shown = (displayText ?? composed).trim() || composed;
            setMessages((prev) => appendUserMessage(prev, shown));
            setMessages((prev) => appendMetaMessage(prev, "Steer sent"));
            setPrompt("");
            setPickedSnippets([]);
            return true;
          },
          send: async ({ composed, queue }) => {
            const runModelId = modelIdForStartRun(selectedModelId);
            const shown =
              (displayText ?? text).trim() ||
              "Please review the attached context.";
            const chips = toContextChips(contextItems);
            const ref = await ports.runtime.startRun({
              prompt: composed,
              ...(activeChatId ? { chatId: activeChatId } : {}),
              ...(permissionMode ? { permissionMode } : {}),
              ...(runModelId ? { modelId: runModelId } : {}),
              ...(queue ? { queue: true } : {}),
              ...(runAttachments.length > 0
                ? { attachments: runAttachments }
                : {}),
            });
            setActiveChatId(ref.chatId);
            if (!queue) {
              setActiveRunId(ref.runId);
              setRunUsage(ZERO_RUN_USAGE);
            }
            rememberTab(ref.chatId);
            setMessages((prev) =>
              appendUserMessage(prev, shown, {
                chips,
              }),
            );
            if (queue) {
              setMessages((prev) =>
                appendMetaMessage(prev, "Queued next run"),
              );
            }
            setPrompt("");
            setContextItems([]);
            setPickedSnippets([]);
            setSessionListKey((key) => key + 1);
            if (ref.chatId !== activeChatId) {
              onFocusChat({ chatId: ref.chatId });
            }
            return true;
          },
        },
      });
      if (result.kind === "error") {
        // onError already set message when host threw
      }
    } finally {
      setBusy(false);
    }
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
      case "copy": {
        const text = formatTranscriptForCopy(messages);
        if (!text) {
          setMessages((prev) =>
            appendMetaMessage(prev, "Nothing to copy yet."),
          );
          return;
        }
        try {
          await navigator.clipboard?.writeText(text);
          setCopiedTranscript(true);
          window.setTimeout(() => {
            setCopiedTranscript(false);
          }, 1500);
          setMessages((prev) =>
            appendMetaMessage(prev, "Copied transcript to clipboard"),
          );
        } catch {
          setMessages((prev) =>
            appendMetaMessage(prev, "Clipboard copy failed"),
          );
        }
        return;
      }
      case "connect":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.connectProvider",
        });
        break;
      case "disconnect":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.clearProviderCredential",
        });
        break;
      case "walkthrough":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.openWalkthrough",
        });
        break;
      case "extension-settings":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.openExtensionSettings",
        });
        break;
      case "copy-diag":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.copyDiagnosticsReport",
        });
        break;
      case "attach-problems":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.askAboutProblems",
        });
        break;
      case "pick-root":
        await requestWorkspace("executeAltaiCommand", {
          command: "altai.pickProjectRoot",
        });
        break;
      case "attach-diff": {
        if (!canGitDiff) {
          setMessages((prev) =>
            appendMetaMessage(
              prev,
              "Working-tree attach is unavailable on this host.",
            ),
          );
          return;
        }
        try {
          const diff = await ports.workspace.getGitDiff();
          const item = buildDiffContextItem(diff);
          if (!item) {
            setMessages((prev) =>
              appendMetaMessage(prev, "No git working-tree changes to attach."),
            );
            return;
          }
          setContextItems((prev) => addContextItem(prev, item));
          setMessages((prev) =>
            appendMetaMessage(prev, "Attached working-tree context"),
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "attach_diff_failed";
          setMessages((prev) =>
            appendMetaMessage(prev, `Could not attach working tree: ${message}`),
          );
        }
        return;
      }
      case "attach-terminal": {
        if (!canTerminal) {
          setMessages((prev) =>
            appendMetaMessage(
              prev,
              "Terminal attach is unavailable on this host.",
            ),
          );
          return;
        }
        try {
          const terminal = await ports.workspace.getTerminalContext();
          const item = buildTerminalContextItem(terminal);
          if (!item) {
            setMessages((prev) =>
              appendMetaMessage(prev, "No terminal context to attach."),
            );
            return;
          }
          setContextItems((prev) => addContextItem(prev, item));
          setMessages((prev) =>
            appendMetaMessage(prev, "Attached terminal context"),
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "attach_terminal_failed";
          setMessages((prev) =>
            appendMetaMessage(prev, `Could not attach terminal: ${message}`),
          );
        }
        return;
      }
      case "attach-file": {
        if (!canActiveFile) {
          setMessages((prev) =>
            appendMetaMessage(
              prev,
              "Active-file attach is unavailable on this host.",
            ),
          );
          return;
        }
        try {
          const file = await ports.workspace.getActiveFile();
          const item = buildFileContextItem(file);
          if (!item) {
            setMessages((prev) =>
              appendMetaMessage(prev, "No active workspace file to attach."),
            );
            return;
          }
          setContextItems((prev) => addContextItem(prev, item));
          setMessages((prev) =>
            appendMetaMessage(prev, "Attached active file"),
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "attach_file_failed";
          setMessages((prev) =>
            appendMetaMessage(prev, `Could not attach file: ${message}`),
          );
        }
        return;
      }
      case "attach-selection": {
        if (!canSelection) {
          setMessages((prev) =>
            appendMetaMessage(
              prev,
              "Selection attach is unavailable on this host.",
            ),
          );
          return;
        }
        try {
          const selection = await ports.workspace.getSelection();
          const item = buildSelectionContextItem(selection);
          if (!item) {
            setMessages((prev) =>
              appendMetaMessage(prev, "No editor selection to attach."),
            );
            return;
          }
          setContextItems((prev) => addContextItem(prev, item));
          setMessages((prev) =>
            appendMetaMessage(prev, "Attached editor selection"),
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "attach_selection_failed";
          setMessages((prev) =>
            appendMetaMessage(prev, `Could not attach selection: ${message}`),
          );
        }
        return;
      }
      default:
        break;
    }
    if (toast) {
      setMessages((prev) => appendMetaMessage(prev, toast));
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
      setError(formatHostUserError(err));
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
      const agent = resolveComposerAgent(selectedAgentId);
      const editPrompt = applyAgentPromptPrefix(text, agent);
      const ref = await ports.runtime.startRun({
        prompt: editPrompt,
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
      setError(formatHostUserError(err));
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
      setError(formatHostUserError(err));
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
      <AgentChatLayout
        density="auto"
        main={
          <>
          <div className="altai-chat-toolbar">
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
            {openTabs.length > 0 ? (
              <div className="altai-chat-toolbar-tabs">
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
              </div>
            ) : (
              <div className="altai-chat-toolbar-tabs" aria-hidden="true" />
            )}
          </div>
          <AiChatMainColumn
            planMode={
              <>
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
              </>
            }
            transcript={
              <div className="altai-chat-scroll">
                <AiChatTranscriptFrame
                  isEmpty={showEmptyHome}
                  empty={<EmptyState agentName="ALTAI" affordanceHint />}
                  contentClassName="altai-chat-transcript-content max-w-none px-0 py-0 gap-0"
                >
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
                </AiChatTranscriptFrame>
              </div>
            }
            runChrome={
              <>
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
              </>
            }
            composer={
          <div className="altai-chat-composer-dock">
            <ChatProviderConnectBanner />
            <form
              className="altai-chat-composer-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <AiComposer
                busy={busy}
                attachments={
                  <ChatComposerContext
                    surface="attachments"
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
                }
                value={prompt}
                onChange={(next) => {
                  setCursor((prev) =>
                    advanceCaretAfterDraftChange(prev, next, prompt.length),
                  );
                  setPrompt(next);
                }}
                onCaretChange={setCursor}
                placeholder={
                  activeRunId
                    ? canQueue || canSteer
                      ? "Add a follow-up, steer the active run, or queue the next task…"
                      : "Describe a task or ask a follow-up…"
                    : canStartRun
                      ? "Describe a task or ask a follow-up…  @ files  / commands  # snippets"
                      : "Start run capability unavailable"
                }
                disabled={
                  busy ||
                  (!canStartRun && !(activeRunId && (canSteer || canQueue)))
                }
                pickers={
                  <>
                    <ChatComposerAtMention
                      prompt={prompt}
                      cursor={cursor}
                      items={contextItems}
                      onChangePrompt={(next) => {
                        setPrompt(next);
                        setCursor(next.length);
                      }}
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
                  </>
                }
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
                    if (atMentionRef.current.handleKeyDown(event.key)) {
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
                followup={
                  extensionPrefs.showFollowupHints ? (
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
                  ) : undefined
                }
                agentSlot={
                  extensionPrefs.agentPickerEnabled ? (
                    <ChatAgentPickerChrome
                      agentId={selectedAgentId}
                      disabled={busy}
                      enabled={extensionPrefs.agentPickerEnabled}
                      onAgentChange={(agent) => {
                        setSelectedAgentId(agent.id);
                        onAgentIdChange?.(agent.id);
                      }}
                    />
                  ) : undefined
                }
                modelSlot={
                  canModelConfigRow ? (
                    <ChatModelPickerChrome
                      onModelChange={setSelectedModelId}
                    />
                  ) : undefined
                }
                tools={
                  <>
                    <ChatComposerContext
                      surface="toolbar"
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
                    variant="toolbar-icon"
                    onModeChange={setPermissionMode}
                    showBypassAlways={extensionPrefs.bypassPermissionsEnabled}
                  />
                }
                submit={
                  (() => {
                    const submitMode = composerSubmitChromeMode({
                      busy,
                      hasActiveRun: Boolean(activeRunId),
                    });
                    const hasPrompt = Boolean(
                      prompt.trim() ||
                        contextItems.length > 0 ||
                        pickedSnippets.length > 0,
                    );
                    if (submitMode === "stop") {
                      return (
                        <button
                          type="button"
                          className="altai-composer-stop"
                          disabled={
                            !canEnableComposerStop({
                              hasActiveRun: Boolean(activeRunId),
                              busy,
                            })
                          }
                          onClick={() => void onCancel()}
                          aria-label="Stop"
                          title="Stop"
                        >
                          <span
                            className="altai-composer-stop-square"
                            aria-hidden="true"
                          />
                          <span className="altai-ai-composer-submit-label">
                            {busy ? "Stopping" : "Stop"}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <button
                        type="submit"
                        className="altai-composer-submit altai-composer-submit--icon"
                        disabled={
                          !canEnableComposerSend({
                            busy,
                            hasPrompt,
                            canStartRun,
                            hasActiveRun: Boolean(activeRunId),
                            canSteer,
                            canQueue,
                          })
                        }
                        aria-label="Send"
                        title="Send · Enter"
                      >
                        <HugeiconsIcon
                          icon={ArrowUpIcon}
                          size={13}
                          strokeWidth={2.25}
                        />
                      </button>
                    );
                  })()
                }
              />
            </form>
          </div>
            }
          />
          </>
        }
      />
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
