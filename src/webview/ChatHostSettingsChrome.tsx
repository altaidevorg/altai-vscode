/**
 * Host / workspace Settings section — Desktop SettingRow layout.
 */

import { SurfaceSecondaryAction, formatHostUserError } from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import { listRecoveryActions } from "./hostRecoveryActions.js";
import {
  SettingsSettingRow,
  SettingsSubsection,
} from "./settingsSectionLayout.js";

export type ChatHostSettingsChromeProps = {
  hostStatusLabel?: string;
  diagnosticCode?: string;
  hostMessage?: string;
  requestWorkspace: (method: string, params?: unknown) => Promise<unknown>;
};

type WorkspaceSnapshot = {
  roots: string[];
  trusted: boolean;
  currentDir?: string;
};

function asWorkspace(value: unknown): WorkspaceSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const roots = Array.isArray(record.roots)
    ? record.roots.filter((item): item is string => typeof item === "string")
    : [];
  return {
    roots,
    trusted: Boolean(record.trusted),
    ...(typeof record.currentDir === "string"
      ? { currentDir: record.currentDir }
      : {}),
  };
}

function shortUri(uri: string): string {
  const withoutScheme = uri.replace(/^file:\/\//, "");
  const parts = withoutScheme.split("/").filter(Boolean);
  if (parts.length <= 2) {
    return withoutScheme || uri;
  }
  return `…/${parts.slice(-2).join("/")}`;
}

export function ChatHostSettingsChrome({
  hostStatusLabel,
  diagnosticCode,
  hostMessage,
  requestWorkspace,
}: ChatHostSettingsChromeProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setWorkspace(asWorkspace(await requestWorkspace("getWorkspace")));
    } catch (err) {
      setError(formatHostUserError(err));
      setWorkspace(null);
    }
  }, [requestWorkspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const recoveryActions = listRecoveryActions({ diagnosticCode });
  const projectRoot = workspace?.currentDir?.trim()
    ? workspace.currentDir
    : workspace?.roots[0]
      ? shortUri(workspace.roots[0])
      : "No folder open";

  return (
    <div className="altai-settings-stack" aria-label="Host and workspace">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsSubsection label="Status" />
      <SettingsSettingRow
        title="Host status"
        description="Lifecycle of the native agent process (altai-cli)."
      >
        <span className="altai-settings-row-value">
          {hostStatusLabel?.trim() || "unknown"}
        </span>
      </SettingsSettingRow>
      {diagnosticCode ? (
        <SettingsSettingRow
          title="Diagnostic code"
          description="Stable recovery code when the host is not ready."
        >
          <code className="altai-settings-row-value">{diagnosticCode}</code>
        </SettingsSettingRow>
      ) : null}
      {hostMessage?.trim() ? (
        <SettingsSettingRow
          title="Last host message"
          description={hostMessage.trim()}
          stacked
        />
      ) : null}
      <SettingsSettingRow
        title="Workspace trust"
        description="Native host and filesystem tools require a trusted workspace."
      >
        <span className="altai-settings-row-value">
          {workspace
            ? workspace.trusted
              ? "Trusted"
              : "Not trusted"
            : "—"}
        </span>
      </SettingsSettingRow>

      <SettingsSubsection label="Project" />
      <SettingsSettingRow
        title="Project root"
        description="Folder used for --workspace when starting the agent host."
        stacked
      >
        <div className="altai-settings-field-row">
          <code className="altai-settings-path">{projectRoot}</code>
          <SurfaceSecondaryAction
            type="button"
            disabled={busy}
            onClick={() => {
              void requestWorkspace("executeAltaiCommand", {
                command: "altai.pickProjectRoot",
              });
            }}
          >
            Pick root
          </SurfaceSecondaryAction>
        </div>
      </SettingsSettingRow>
      {workspace && workspace.roots.length > 1 ? (
        <SettingsSettingRow
          title="Open folders"
          description="All folders currently open in this window."
          stacked
        >
          <ul className="altai-settings-root-list">
            {workspace.roots.map((root) => (
              <li key={root}>{shortUri(root)}</li>
            ))}
          </ul>
        </SettingsSettingRow>
      ) : null}

      <SettingsSubsection label="Actions" />
      <div className="altai-settings-field-actions altai-settings-field-actions--wrap">
        <SurfaceSecondaryAction
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void requestWorkspace("executeAltaiCommand", {
              command: "altai.restartAgentHost",
            })
              .catch((err: unknown) => {
                setError(formatHostUserError(err));
              })
              .finally(() => {
                setBusy(false);
                void load();
              });
          }}
        >
          Restart agent host
        </SurfaceSecondaryAction>
        <SurfaceSecondaryAction type="button" onClick={() => void load()}>
          Refresh
        </SurfaceSecondaryAction>
        {recoveryActions.map((action) => (
          <SurfaceSecondaryAction
            key={action.command}
            type="button"
            onClick={() => {
              void requestWorkspace("executeAltaiCommand", {
                command: action.command,
              }).catch(() => {
                /* allowlisted */
              });
            }}
          >
            {action.label}
          </SurfaceSecondaryAction>
        ))}
      </div>
    </div>
  );
}
