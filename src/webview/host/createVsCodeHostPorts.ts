/**
 * VS Code Webview adapter for `@altai/host-contract` HostPorts.
 *
 * TASK-009: chat ports call the Extension Host via `host.request`, which
 * proxies JSON-RPC to `altai-cli serve`.
 */

import {
  createCapabilities,
  type AgentEvent,
  type AgentEventType,
  type Capabilities,
  type AltaiSettings,
  type CheckpointInfo,
  type FileContent,
  type FileContext,
  type FileMatch,
  type GitDiffContext,
  type HostPorts,
  type InitializeInput,
  type ModelInfo,
  type NotificationInfo,
  type ProviderStatus,
  type ReplayPage,
  type SessionInfo,
  type SessionMessage,
  type SelectionContext,
  type TerminalContext,
  type TaskRunInfo,
  type WorkspaceInfo,
} from "@altai/host-contract";
import { withUnsupportedDefaults } from "./unsupported.js";

const HOST_NAME = "altai-vscode";

export type HostRpcTransport = {
  request(method: string, params?: unknown): Promise<unknown>;
  requestWorkspace(method: string, params?: unknown): Promise<unknown>;
  onNotification(
    listener: (notification: { method: string; params?: unknown }) => void,
  ): () => void;
};

export type VsCodeHostPortsOptions = {
  hostVersion?: string;
  /** True when HostManager lifecycle is Ready (native host accepting RPC). */
  isHostReady: () => boolean;
  /** Native RPC methods advertised during the initialize handshake. */
  getNativeCapabilities?: () => readonly string[] | null;
  transport: HostRpcTransport;
};

/**
 * Build the VS Code HostPorts aggregate used by `@altai/agent-ui`.
 */
export function createVsCodeHostPorts(
  options: VsCodeHostPortsOptions,
): HostPorts {
  const hostVersion = options.hostVersion ?? "0.1.0";
  const { transport, isHostReady } = options;
  const hasNativeMethod = (method: string): boolean => {
    const capabilities = options.getNativeCapabilities?.();
    return capabilities === null || capabilities === undefined || capabilities.includes(method);
  };

  return {
    runtime: withUnsupportedDefaults(
      "runtime",
      [
        "initialize",
        "startRun",
        "steerRun",
        "cancelRun",
        "retryRun",
        "respondToApproval",
        "respondToClarification",
        "compactContext",
        "replayRun",
        "shutdown",
      ],
      {
        async initialize(_input: InitializeInput): Promise<Capabilities> {
          const ready = isHostReady();
          return createCapabilities({
            protocolVersion: 1,
            hostName: HOST_NAME,
            hostVersion,
            overrides: ready
              ? {
                  "runtime.startRun": nativeAvailability(hasNativeMethod("run/start")),
                  "runtime.retryRun": nativeAvailability(hasNativeMethod("run/retry")),
                  "runtime.queueRun": nativeAvailability(hasNativeMethod("run/start")),
                  "runtime.cancelRun": nativeAvailability(hasNativeMethod("run/cancel")),
                  "runtime.steerRun": nativeAvailability(hasNativeMethod("run/steer")),
                  "runtime.replayRun": nativeAvailability(hasNativeMethod("run/replay")),
                  "runtime.compactContext": nativeAvailability(hasNativeMethod("context/compact")),
                  "interactive.approval": nativeAvailability(hasNativeMethod("clarification/respond")),
                  "interactive.clarification": nativeAvailability(hasNativeMethod("clarification/respond")),
                  "runtime.events": "available",
                  "sessions.list": nativeAvailability(hasNativeMethod("sessions/list")),
                  "sessions.get": nativeAvailability(hasNativeMethod("sessions/get")),
                  "sessions.create": nativeAvailability(hasNativeMethod("sessions/create")),
                  "sessions.rename": nativeAvailability(hasNativeMethod("sessions/rename")),
                  "sessions.archive": nativeAvailability(hasNativeMethod("sessions/archive")),
                  "sessions.delete": nativeAvailability(hasNativeMethod("sessions/delete")),
                  "sessions.messages": nativeAvailability(hasNativeMethod("sessions/messages")),
                  "sessions.truncate": nativeAvailability(hasNativeMethod("sessions/truncate")),
                  "models.list": nativeAvailability(hasNativeMethod("models/list")),
                  "models.select": nativeAvailability(hasNativeMethod("config/update")),
                  "settings.get": nativeAvailability(hasNativeMethod("config/get")),
                  "settings.update": nativeAvailability(hasNativeMethod("config/update")),
                  "settings.providerStatus": nativeAvailability(hasNativeMethod("providers/status")),
                  "interactive.permissionModes": "available",
                  "workspace.info": "available",
                  "workspace.activeFile": "available",
                  "workspace.selection": "available",
                  "workspace.searchFiles": "available",
                  "workspace.readFile": "available",
                  "workspace.openFile": "available",
                  "workspace.openDiff": "available",
                  "workspace.gitDiff": "available",
                  "workspace.terminalContext": "available",
                  "review.checkpoints": nativeAvailability(hasNativeMethod("checkpoints/list")),
                  "review.restoreCheckpoint": nativeAvailability(hasNativeMethod("checkpoints/restore")),
                  "work.taskRuns": nativeAvailability(
                    ["work/tasks/list", "work/tasks/create", "work/tasks/cancel", "work/tasks/retry", "work/tasks/remove"].every(hasNativeMethod),
                  ),
                  "inbox.notifications": hasNativeMethod("inbox/list") && hasNativeMethod("inbox/mark-seen") && hasNativeMethod("inbox/resolve") ? "available" : "deferred",
                }
              : {
                  "runtime.startRun": "deferred",
                  "runtime.steerRun": "deferred",
                  "runtime.cancelRun": "deferred",
                  "runtime.retryRun": "deferred",
                  "runtime.queueRun": "deferred",
                  "runtime.compactContext": "deferred",
                  "runtime.replayRun": "deferred",
                  "runtime.events": "deferred",
                  "sessions.list": "deferred",
                  "sessions.get": "deferred",
                  "sessions.create": "deferred",
                  "sessions.rename": "deferred",
                  "sessions.archive": "deferred",
                  "sessions.delete": "deferred",
                  "sessions.messages": "deferred",
                  "sessions.truncate": "deferred",
                  "models.list": "deferred",
                  "models.select": "deferred",
                  "settings.get": "deferred",
                  "settings.update": "deferred",
                  "settings.providerStatus": "deferred",
                  "interactive.permissionModes": "deferred",
                  "interactive.approval": "deferred",
                  "interactive.clarification": "deferred",
                  "workspace.info": "deferred",
                  "workspace.activeFile": "deferred",
                  "workspace.selection": "deferred",
                  "workspace.searchFiles": "deferred",
                  "workspace.readFile": "deferred",
                  "workspace.openFile": "deferred",
                  "workspace.openDiff": "deferred",
                  "workspace.gitDiff": "deferred",
                  "workspace.terminalContext": "deferred",
                  "review.checkpoints": "deferred",
                  "review.restoreCheckpoint": "deferred",
                  "work.taskRuns": "deferred",
                },
          });
        },
        async startRun(input) {
          requireReady(isHostReady);
          const chatId = input.chatId ?? cryptoRandomId("chat");
          await transport.request("sessions/create", { chat_id: chatId });
          const result = await transport.request("run/start", {
            chat_id: chatId,
            prompt: input.prompt,
            ...(input.modelId ? { model: input.modelId } : {}),
            ...(input.permissionMode
              ? { permission: input.permissionMode }
              : {}),
            ...(input.queue ? { queue: true } : {}),
          });
          const runId =
            readStringField(result, "run_id") ?? cryptoRandomId("run");
          return { chatId, runId };
        },
        async cancelRun(input) {
          requireReady(isHostReady);
          await transport.request("run/cancel", {
            chat_id: input.chatId,
            run_id: input.runId,
          });
        },
        async steerRun(input) {
          requireReady(isHostReady);
          await transport.request("run/steer", {
            chat_id: input.chatId,
            run_id: input.runId,
            content: input.prompt,
          });
        },
        async retryRun(input) {
          requireReady(isHostReady);
          const result = await transport.request("run/retry", {
            chat_id: input.chatId,
            ...(input.runId ? { run_id: input.runId } : {}),
            ...(input.editUserMessage
              ? { edit_user_message: input.editUserMessage }
              : {}),
          });
          return {
            chatId: input.chatId,
            runId: readStringField(result, "run_id") ?? cryptoRandomId("run"),
          };
        },
        async replayRun(input): Promise<ReplayPage> {
          requireReady(isHostReady);
          const result = await transport.request("run/replay", {
            chat_id: input.chatId,
            run_id: input.runId,
            ...(input.afterSeq !== undefined
              ? { after_seq: input.afterSeq }
              : {}),
            ...(input.limit !== undefined ? { limit: input.limit } : {}),
          });
          return normalizeReplayPage(result, input.chatId, input.runId);
        },
        async compactContext(input) {
          requireReady(isHostReady);
          await transport.request("context/compact", { chat_id: input.chatId });
        },
        async respondToClarification(input) {
          requireReady(isHostReady);
          await transport.request("clarification/respond", {
            chat_id: input.chatId,
            action: input.action,
            ...(input.action === "reply" ? { text: input.text ?? "" } : {}),
          });
        },
        async respondToApproval(input) {
          requireReady(isHostReady);
          await transport.request("clarification/respond", {
            chat_id: input.chatId,
            action: "reply",
            text: input.decision,
          });
        },
        async shutdown() {
          // Native host lifecycle is owned by the Extension Host.
        },
      },
    ),
    sessions: withUnsupportedDefaults(
      "sessions",
      [
        "listSessions",
        "getSession",
        "createSession",
        "renameSession",
        "archiveSession",
        "deleteSession",
        "truncateSession",
        "listMessages",
      ],
      {
        async listSessions(): Promise<SessionInfo[]> {
          requireReady(isHostReady);
          const result = await transport.request("sessions/list", {
            limit: 50,
          });
          return normalizeSessionList(result);
        },
        async getSession(sessionId: string): Promise<SessionInfo | null> {
          requireReady(isHostReady);
          const result = await transport.request("sessions/get", {
            chat_id: sessionId,
          });
          if (!result || typeof result !== "object") {
            return null;
          }
          return normalizeSession(result);
        },
        async createSession(title?: string): Promise<SessionInfo> {
          requireReady(isHostReady);
          const chatId = cryptoRandomId("chat");
          const result = await transport.request("sessions/create", {
            chat_id: chatId,
            ...(title ? { title } : {}),
          });
          return normalizeSession(result) ?? {
            id: chatId,
            title: title ?? "New chat",
            updatedAt: new Date().toISOString(),
          };
        },
        async renameSession(sessionId: string, title: string): Promise<SessionInfo> {
          requireReady(isHostReady);
          const session = normalizeSession(
            await transport.request("sessions/rename", { chat_id: sessionId, title }),
          );
          if (!session) {
            throw new Error("invalid_session_response");
          }
          return session;
        },
        async archiveSession(sessionId: string): Promise<void> {
          requireReady(isHostReady);
          await transport.request("sessions/archive", { chat_id: sessionId });
        },
        async deleteSession(sessionId: string): Promise<void> {
          requireReady(isHostReady);
          await transport.request("sessions/delete", { chat_id: sessionId });
        },
        async listMessages(sessionId: string): Promise<SessionMessage[]> {
          requireReady(isHostReady);
          const result = await transport.request("sessions/messages", {
            chat_id: sessionId,
          });
          return normalizeMessages(result, sessionId);
        },
        async truncateSession(sessionId: string, afterMessageId: string): Promise<void> {
          requireReady(isHostReady);
          const keepUserMessages = userTurnFromMessageId(afterMessageId);
          if (keepUserMessages === null) {
            throw new Error("session_truncate_requires_user_message");
          }
          await transport.request("sessions/truncate", {
            chat_id: sessionId,
            keep_user_messages: keepUserMessages,
          });
        },
      },
    ),
    workspace: withUnsupportedDefaults(
      "workspace",
      [
        "getWorkspace",
        "getActiveFile",
        "getSelection",
        "searchFiles",
        "readFile",
        "openFile",
        "openDiff",
        "getGitDiff",
        "getTerminalContext",
      ],
      {
        async getWorkspace() {
          requireReady(isHostReady);
          return normalizeWorkspaceInfo(
            await transport.requestWorkspace("getWorkspace"),
          );
        },
        async getActiveFile() {
          requireReady(isHostReady);
          return normalizeFileContext(
            await transport.requestWorkspace("getActiveFile"),
          );
        },
        async getSelection() {
          requireReady(isHostReady);
          return normalizeSelectionContext(
            await transport.requestWorkspace("getSelection"),
          );
        },
        async searchFiles(query) {
          requireReady(isHostReady);
          return normalizeFileMatches(
            await transport.requestWorkspace("searchFiles", { query }),
          );
        },
        async readFile(uri) {
          requireReady(isHostReady);
          return normalizeFileContent(
            await transport.requestWorkspace("readFile", { uri }),
          );
        },
        async openFile(uri, range) {
          requireReady(isHostReady);
          await transport.requestWorkspace("openFile", {
            uri,
            ...(range ? { range } : {}),
          });
        },
        async openDiff(input) {
          requireReady(isHostReady);
          await transport.requestWorkspace("openDiff", input);
        },
        async getGitDiff(): Promise<GitDiffContext | null> {
          requireReady(isHostReady);
          return normalizeGitDiffContext(
            await transport.requestWorkspace("getGitDiff"),
          );
        },
        async getTerminalContext(): Promise<TerminalContext | null> {
          requireReady(isHostReady);
          return normalizeTerminalContext(
            await transport.requestWorkspace("getTerminalContext"),
          );
        },
      },
    ),
    settings: withUnsupportedDefaults(
      "settings",
      [
        "getSettings",
        "updateSettings",
        "getProviderStatus",
        "beginProviderConnection",
        "clearProviderCredential",
        "listModels",
        "setPermissionMode",
      ],
      {
        async getSettings(): Promise<AltaiSettings> {
          requireReady(isHostReady);
          return normalizeSettings(await transport.request("config/get", {}));
        },
        async updateSettings(patch) {
          requireReady(isHostReady);
          if (Object.keys(patch).some((key) => key !== "defaultModelId" && key !== "permissionMode")) {
            throw new Error("unsupported_settings_patch");
          }
          if (patch.defaultModelId === undefined && patch.permissionMode === undefined) {
            return normalizeSettings(await transport.request("config/get", {}));
          }
          return normalizeSettings(
            await transport.request("config/update", {
              ...(patch.defaultModelId !== undefined ? { model: patch.defaultModelId } : {}),
              ...(patch.permissionMode !== undefined ? { permission: patch.permissionMode } : {}),
            }),
          );
        },
        async getProviderStatus(): Promise<ProviderStatus[]> {
          requireReady(isHostReady);
          return normalizeProviderStatus(
            await transport.request("providers/status", {}),
          );
        },
        async listModels(): Promise<ModelInfo[]> {
          requireReady(isHostReady);
          const result = await transport.request("models/list", {});
          return normalizeModels(result);
        },
        async setPermissionMode(mode) {
          requireReady(isHostReady);
          if (mode === "bypass") throw new Error("permission_bypass_requires_confirmation");
          const settings = await transport.request("config/update", { permission: mode });
          return normalizeSettings(settings).permissionMode;
        },
      },
    ),
    review: withUnsupportedDefaults(
      "review",
      [
        "listCheckpoints",
        "restoreCheckpoint",
        "applyEditProposal",
        "denyEditProposal",
      ],
      {
        async listCheckpoints(chatId): Promise<CheckpointInfo[]> {
          requireReady(isHostReady);
          return normalizeCheckpoints(
            await transport.request("checkpoints/list", { chat_id: chatId }),
            chatId,
          );
        },
        async restoreCheckpoint(checkpointId) {
          requireReady(isHostReady);
          await transport.request("checkpoints/restore", { id: checkpointId });
        },
      },
    ),
    work: withUnsupportedDefaults(
      "work",
      [
        "listTaskRuns",
        "createTaskRun",
        "cancelTaskRun",
        "retryTaskRun",
        "removeTaskRun",
        "listAutomations",
        "createAutomation",
        "updateAutomation",
        "triggerAutomation",
        "pauseAutomation",
        "deleteAutomation",
      ],
      {
        async listTaskRuns(): Promise<TaskRunInfo[]> {
          requireReady(isHostReady);
          return normalizeTaskRuns(await transport.request("work/tasks/list"));
        },
        async createTaskRun(input): Promise<TaskRunInfo> {
          requireReady(isHostReady);
          const id = cryptoRandomId("task");
          const result = await transport.request("work/tasks/create", {
            chat_id: id,
            task_title: input.title,
            prompt: input.prompt,
            ...(input.permissionMode ? { permission: input.permissionMode } : {}),
          });
          const taskRunId = readStringField(result, "task_id");
          if (!taskRunId) {
            throw new Error("invalid_task_create_response");
          }
          return findTaskRun(
            normalizeTaskRuns(await transport.request("work/tasks/list")),
            taskRunId,
          );
        },
        async cancelTaskRun(taskRunId) {
          requireReady(isHostReady);
          await transport.request("work/tasks/cancel", { task_id: taskRunId });
        },
        async retryTaskRun(taskRunId): Promise<TaskRunInfo> {
          requireReady(isHostReady);
          await transport.request("work/tasks/retry", { task_id: taskRunId });
          return findTaskRun(
            normalizeTaskRuns(await transport.request("work/tasks/list")),
            taskRunId,
          );
        },
        async removeTaskRun(taskRunId) {
          requireReady(isHostReady);
          await transport.request("work/tasks/remove", { task_id: taskRunId });
        },
      },
    ),
    inbox: withUnsupportedDefaults(
      "inbox",
      [
        "listNotifications",
        "markNotificationSeen",
        "resolveNotification",
        "dismissNotification",
      ],
      {
        async listNotifications(): Promise<NotificationInfo[]> {
          requireReady(isHostReady);
          const result = await transport.request("inbox/list", {});
          const notifications = isRecord(result) && Array.isArray(result.notifications) ? result.notifications : [];
          return notifications.filter(isRecord).map((item) => ({
            id: typeof item.notification_id === "string" ? item.notification_id : "",
            chatId: typeof item.chat_id === "string" ? item.chat_id : "",
            title: typeof item.title === "string" ? item.title : "Notification",
            body: typeof item.body === "string" ? item.body : "",
            seen: typeof item.seen_at_ms === "number",
            createdAt: typeof item.created_at_ms === "number" ? new Date(item.created_at_ms).toISOString() : new Date(0).toISOString(),
          })).filter((item) => item.id.length > 0);
        },
        async markNotificationSeen(id) { requireReady(isHostReady); await transport.request("inbox/mark-seen", { notification_id: id }); },
        async resolveNotification(id) { requireReady(isHostReady); await transport.request("inbox/resolve", { notification_id: id }); },
        async dismissNotification(id) { requireReady(isHostReady); await transport.request("inbox/resolve", { notification_id: id }); },
      },
    ),
    mcpSkills: withUnsupportedDefaults(
      "mcpSkills",
      [
        "listMcpServers",
        "configureMcpServer",
        "setMcpServerEnabled",
        "restartMcpServer",
        "listSkills",
        "installSkill",
        "setSkillEnabled",
      ],
      {},
    ),
    events: {
      subscribe(listener: (event: AgentEvent) => void): () => void {
        return transport.onNotification((notification) => {
          if (notification.method !== "run/event") {
            return;
          }
          const mapped = mapRunEvent(notification.params);
          if (mapped) {
            listener(mapped);
          }
        });
      },
    },
  };
}

function requireReady(isHostReady: () => boolean): void {
  if (!isHostReady()) {
    throw new Error("host_not_ready");
  }
}

function nativeAvailability(available: boolean): "available" | "deferred" {
  return available ? "available" : "deferred";
}

function cryptoRandomId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : undefined;
}

function normalizeSessionList(value: unknown): SessionInfo[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const sessions = (value as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions)) {
    return [];
  }
  return sessions
    .map((item) => normalizeSession(item))
    .filter((item): item is SessionInfo => item !== null);
}

function normalizeSession(value: unknown): SessionInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id =
    (typeof record.chat_id === "string" && record.chat_id) ||
    (typeof record.id === "string" && record.id) ||
    "";
  if (!id) {
    return null;
  }
  return {
    id,
    title:
      typeof record.title === "string"
        ? record.title
        : typeof record.label === "string"
          ? record.label
          : id,
    updatedAt:
      typeof record.updated_at === "string"
        ? record.updated_at
        : typeof record.updated_at_ms === "number"
          ? new Date(record.updated_at_ms).toISOString()
        : new Date().toISOString(),
    ...(typeof record.archived === "boolean" ? { archived: record.archived } : {}),
  };
}

function normalizeReplayPage(
  value: unknown,
  chatId: string,
  runId: string,
): ReplayPage {
  const events = extractEvents(value)
    .map((item) => mapRunEvent(item))
    .filter((item): item is AgentEvent => item !== null);
  const seq =
    events.length > 0 ? (events[events.length - 1]?.seq ?? 0) : 0;
  const exhausted =
    isRecord(value) && typeof value.exhausted === "boolean"
      ? value.exhausted
      : true;
  return {
    events,
    cursor: events.length > 0 ? { chatId, runId, seq } : null,
    exhausted,
  };
}

function normalizeMessages(
  value: unknown,
  sessionId: string,
): SessionMessage[] {
  const messages =
    isRecord(value) && Array.isArray(value.messages) ? value.messages : [];
  return messages.map((message, index) => {
    const record = isRecord(message) ? message : {};
    const role =
      record.role === "user" ||
      record.role === "assistant" ||
      record.role === "system" ||
      record.role === "tool"
        ? record.role
        : "assistant";
    const content =
      typeof record.content === "string"
        ? record.content
        : typeof record.text === "string"
          ? record.text
          : JSON.stringify(message);
    return {
      id: typeof record.id === "string" ? record.id : `${sessionId}_${index}`,
      role,
      content,
      createdAt:
        typeof record.created_at === "string"
          ? record.created_at
          : new Date().toISOString(),
    };
  });
}

/** Native transcripts identify only user turns as valid rewind boundaries. */
function userTurnFromMessageId(messageId: string): number | null {
  const match = /^user:([1-9][0-9]*)$/.exec(messageId);
  if (!match) {
    return null;
  }
  const userTurn = Number(match[1]);
  return Number.isSafeInteger(userTurn) ? userTurn : null;
}

function normalizeModels(value: unknown): ModelInfo[] {
  const list =
    value &&
    typeof value === "object" &&
    Array.isArray((value as { models?: unknown }).models)
      ? (value as { models: unknown[] }).models
      : Array.isArray(value)
        ? value
        : [];
  return list
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const id =
        typeof item.id === "string"
          ? item.id
          : typeof item.model_id === "string"
            ? item.model_id
            : null;
      if (!id) {
        return null;
      }
      return {
        id,
        label:
          typeof item.label === "string"
            ? item.label
            : typeof item.name === "string"
              ? item.name
              : id,
        providerId:
          typeof item.provider_id === "string"
            ? item.provider_id
            : typeof item.provider === "string"
              ? item.provider
              : "unknown",
      };
    })
    .filter((item): item is ModelInfo => item !== null);
}

function normalizeProviderStatus(value: unknown): ProviderStatus[] {
  const providers =
    isRecord(value) && Array.isArray(value.providers) ? value.providers : [];
  return providers.flatMap((provider) => {
    if (!isRecord(provider) || typeof provider.provider_id !== "string") {
      return [];
    }
    return [{
      providerId: provider.provider_id,
      connected: provider.connected === true,
      ...(typeof provider.label === "string" ? { label: provider.label } : {}),
      ...(typeof provider.error === "string" ? { error: provider.error } : {}),
    }];
  });
}

function extractEvents(value: unknown): unknown[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as { events?: unknown; items?: unknown };
  if (Array.isArray(record.events)) {
    return record.events;
  }
  if (Array.isArray(record.items)) {
    return record.items;
  }
  return [];
}

const EVENT_TYPES = new Set<AgentEventType>([
  "message",
  "reasoning",
  "tool",
  "usage",
  "diff",
  "approval",
  "clarification",
  "subagent",
  "lifecycle",
  "notification",
  "warning",
]);

function mapRunEvent(value: unknown): AgentEvent | null {
  if (!isRecord(value)) {
    return null;
  }
  const rawType =
    typeof value.type === "string"
      ? value.type
      : typeof value.event === "string"
        ? value.event
        : "lifecycle";
  const type = EVENT_TYPES.has(rawType as AgentEventType)
    ? (rawType as AgentEventType)
    : "lifecycle";
  const chatId =
    typeof value.chat_id === "string"
      ? value.chat_id
      : typeof value.chatId === "string"
        ? value.chatId
        : "";
  const runId =
    typeof value.run_id === "string"
      ? value.run_id
      : typeof value.runId === "string"
        ? value.runId
        : "";
  const seq =
    typeof value.seq === "number"
      ? value.seq
      : typeof value.sequence === "number"
        ? value.sequence
        : 0;
  if (!chatId || !runId) {
    return null;
  }
  return {
    type,
    chatId,
    runId,
    seq,
    payload: value.payload !== undefined ? value.payload : value,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWorkspaceInfo(value: unknown): WorkspaceInfo {
  if (!isRecord(value) || !Array.isArray(value.roots) || typeof value.trusted !== "boolean") {
    throw new Error("invalid_workspace_response");
  }
  const roots = value.roots.filter((root): root is string => typeof root === "string");
  if (roots.length !== value.roots.length) {
    throw new Error("invalid_workspace_response");
  }
  return {
    roots,
    trusted: value.trusted,
    ...(typeof value.currentDir === "string" ? { currentDir: value.currentDir } : {}),
  };
}

function normalizeFileContext(value: unknown): FileContext | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value) || typeof value.uri !== "string" || typeof value.path !== "string") {
    throw new Error("invalid_workspace_response");
  }
  return {
    uri: value.uri,
    path: value.path,
    ...(typeof value.languageId === "string" ? { languageId: value.languageId } : {}),
  };
}

function normalizeSelectionContext(value: unknown): SelectionContext | null {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    typeof value.uri !== "string" ||
    typeof value.path !== "string" ||
    typeof value.text !== "string" ||
    !isRecord(value.range)
  ) {
    throw new Error("invalid_workspace_response");
  }
  const range = value.range;
  const keys = ["startLine", "startCharacter", "endLine", "endCharacter"] as const;
  if (!keys.every((key) => typeof range[key] === "number")) {
    throw new Error("invalid_workspace_response");
  }
  return {
    uri: value.uri,
    path: value.path,
    text: value.text,
    range: {
      startLine: range.startLine as number,
      startCharacter: range.startCharacter as number,
      endLine: range.endLine as number,
      endCharacter: range.endCharacter as number,
    },
  };
}

function normalizeFileMatches(value: unknown): FileMatch[] {
  if (!Array.isArray(value)) {
    throw new Error("invalid_workspace_response");
  }
  return value.map((item) => {
    if (!isRecord(item) || typeof item.uri !== "string" || typeof item.path !== "string") {
      throw new Error("invalid_workspace_response");
    }
    return {
      uri: item.uri,
      path: item.path,
      ...(typeof item.score === "number" ? { score: item.score } : {}),
    };
  });
}

function normalizeFileContent(value: unknown): FileContent {
  if (
    !isRecord(value) ||
    typeof value.uri !== "string" ||
    typeof value.path !== "string" ||
    typeof value.text !== "string" ||
    typeof value.truncated !== "boolean"
  ) {
    throw new Error("invalid_workspace_response");
  }
  return {
    uri: value.uri,
    path: value.path,
    text: value.text,
    truncated: value.truncated,
  };
}

function normalizeGitDiffContext(value: unknown): GitDiffContext | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value) || !Array.isArray(value.files)) {
    throw new Error("invalid_workspace_response");
  }
  const files = value.files.map((item) => {
    if (!isRecord(item) || typeof item.path !== "string" || typeof item.status !== "string") {
      throw new Error("invalid_workspace_response");
    }
    return { path: item.path, status: item.status };
  });
  return {
    files,
    ...(typeof value.branch === "string" ? { branch: value.branch } : {}),
    ...(typeof value.patch === "string" ? { patch: value.patch } : {}),
  };
}

function normalizeTerminalContext(value: unknown): TerminalContext | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error("invalid_workspace_response");
  }
  for (const key of ["cwd", "selectedText", "lastCommand"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") {
      throw new Error("invalid_workspace_response");
    }
  }
  return {
    ...(typeof value.cwd === "string" ? { cwd: value.cwd } : {}),
    ...(typeof value.selectedText === "string" ? { selectedText: value.selectedText } : {}),
    ...(typeof value.lastCommand === "string" ? { lastCommand: value.lastCommand } : {}),
  };
}

function normalizeCheckpoints(value: unknown, chatId: string): CheckpointInfo[] {
  if (!isRecord(value) || !Array.isArray(value.checkpoints)) {
    throw new Error("invalid_checkpoint_response");
  }
  return value.checkpoints.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string") {
      throw new Error("invalid_checkpoint_response");
    }
    const createdAt =
      typeof item.created_ms === "number" && Number.isFinite(item.created_ms)
        ? new Date(item.created_ms).toISOString()
        : new Date(0).toISOString();
    return {
      id: item.id,
      chatId,
      createdAt,
      ...(typeof item.label === "string" ? { label: item.label } : {}),
    };
  });
}

function normalizeTaskRuns(value: unknown): TaskRunInfo[] {
  if (!isRecord(value) || !Array.isArray(value.task_runs)) {
    throw new Error("invalid_task_runs_response");
  }
  return value.task_runs.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      !isTaskRunStatus(item.status)
    ) {
      throw new Error("invalid_task_runs_response");
    }
    return {
      id: item.id,
      ...(typeof item.chat_id === "string" ? { chatId: item.chat_id } : {}),
      title: item.title,
      status: item.status,
      createdAt:
        typeof item.created_at_ms === "number" && Number.isFinite(item.created_at_ms)
          ? new Date(item.created_at_ms).toISOString()
          : new Date(0).toISOString(),
    };
  });
}

function isTaskRunStatus(value: unknown): value is TaskRunInfo["status"] {
  return value === "queued" || value === "running" || value === "succeeded" || value === "failed" || value === "cancelled";
}

function findTaskRun(taskRuns: TaskRunInfo[], id: string): TaskRunInfo {
  const taskRun = taskRuns.find((item) => item.id === id);
  if (!taskRun) {
    throw new Error("task_run_not_found");
  }
  return taskRun;
}

function normalizeSettings(value: unknown): AltaiSettings {
  if (!isRecord(value) || typeof value.model !== "string") {
    throw new Error("invalid_settings_response");
  }
  return {
    permissionMode:
      value.permission === "ask" || value.permission === "auto-edit" || value.permission === "plan"
        ? value.permission
        : "plan",
    bypassEnabled: false,
    ...(value.model !== "auto" ? { defaultModelId: value.model } : {}),
  };
}
