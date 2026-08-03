/**
 * VS Code Webview adapter for `@altai/host-contract` HostPorts.
 *
 * TASK-008 / V3: inject HostPorts into shared UI. Methods that are not yet
 * wired through the Extension Host bridge throw HostPortUnsupportedError.
 * Capability overrides mark those surfaces deferred so controls stay gated.
 */

import {
  createCapabilities,
  type AgentEvent,
  type Capabilities,
  type HostPorts,
  type InitializeInput,
} from "@altai/host-contract";
import { withUnsupportedDefaults } from "./unsupported.js";

const HOST_NAME = "altai-vscode";

export type VsCodeHostPortsOptions = {
  hostVersion?: string;
};

/**
 * Build the VS Code HostPorts aggregate used by `@altai/agent-ui`.
 */
export function createVsCodeHostPorts(
  options: VsCodeHostPortsOptions = {},
): HostPorts {
  const hostVersion = options.hostVersion ?? "0.1.0";

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
          return createCapabilities({
            protocolVersion: 1,
            hostName: HOST_NAME,
            hostVersion,
            // V3 shell only — chat/run surfaces land in TASK-009 / V4.
            overrides: {
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
              "sessions.messages": "deferred",
              "models.list": "deferred",
              "interactive.permissionModes": "deferred",
            },
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
      {},
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
      {},
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
      {},
    ),
    review: withUnsupportedDefaults(
      "review",
      [
        "listCheckpoints",
        "restoreCheckpoint",
        "applyEditProposal",
        "denyEditProposal",
      ],
      {},
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
      {},
    ),
    inbox: withUnsupportedDefaults(
      "inbox",
      [
        "listNotifications",
        "markNotificationSeen",
        "resolveNotification",
        "dismissNotification",
      ],
      {},
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
      subscribe(_listener: (event: AgentEvent) => void): () => void {
        return () => {};
      },
    },
  };
}
