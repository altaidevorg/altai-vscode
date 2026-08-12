/**
 * Studio SettingsContent section bodies for the VS Code thin host.
 * Uses HostPorts for agent config + Extension Host prefs for UI/Studio parity
 * knobs that Desktop stored in preferences — no Desktop JSX/CSS copy-in.
 */

import {
  SurfacePrimaryAction,
  SurfaceSecondaryAction,
  coerceExtensionPreferences,
  formatHostUserError,
  parseSnippetsJson,
  serializeSnippets,
  useCapability,
  useHostPorts,
  type ExtensionPreferences,
  type SnippetPref,
} from "@altai/agent-ui";
import type { ModelInfo } from "@altai/host-contract";
import { useCallback, useEffect, useMemo, useState } from "react";
import { knownProviderById } from "../shared/providerCatalog.js";
import { ChatComposerCompact } from "./ChatComposerCompact.js";
import { ChatModelPickerChrome } from "./ChatModelPickerChrome.js";
import { ChatMcpStatusChrome } from "./ChatMcpStatusChrome.js";
import { ChatPermissionModeChrome } from "./ChatPermissionModeChrome.js";
import { ChatProviderStatusChrome } from "./ChatProviderStatusChrome.js";
import { ChatSkillsStatusChrome } from "./ChatSkillsStatusChrome.js";
import { canMountModelPicker } from "./modelPickerChrome.js";
import { mergeModelCatalog } from "./modelCatalogChrome.js";
import {
  mergeProviderCatalog,
} from "./providerStatusChrome.js";
import {
  SettingsSettingRow,
  SettingsSubsection,
} from "./settingsSectionLayout.js";
import { pathToFileUri } from "./chatHref.js";
import { SettingsSwitch } from "./SettingsSwitch.js";
import { useExtensionPreferences } from "./useExtensionPreferences.js";

type WorkspaceBridge = (method: string, params?: unknown) => Promise<unknown>;

const IGNORE_HELP = `# .isanagentignore — gitignore syntax at the project root.
# Filters ALTAI-related file access from the IDE host.
secrets/**
*.env
!*.env.example
build/
dist/
`;

const SHORTCUT_ROWS: Array<{ command: string; title: string; keys: string }> = [
  { command: "altai.openSidePanel", title: "Open side panel", keys: "⌘⇧A / Ctrl+Shift+A" },
  { command: "altai.openSettings", title: "Open settings", keys: "⌘⇧, / Ctrl+Shift+," },
  { command: "altai.openOperations", title: "Open operations", keys: "see Keybindings" },
  { command: "altai.restartAgentHost", title: "Restart agent host", keys: "⌘⇧⌥R / Ctrl+Shift+Alt+R" },
  { command: "altai.openOperationsInbox", title: "Open inbox", keys: "⌘⇧⌥I / Ctrl+Shift+Alt+I" },
  { command: "altai.openLogs", title: "Open logs", keys: "Keybindings editor" },
];

export function ChatSettingsGeneralPanel({
  requestWorkspace,
}: {
  requestWorkspace: WorkspaceBridge;
}) {
  const { prefs, ready, error, busyKey, patch, reload } =
    useExtensionPreferences(requestWorkspace);

  if (!ready) {
    return <p className="altai-shell-meta">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="altai-settings-stack">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="altai-shell-meta">
        Side-panel preferences for the ALTAI extension. Editor Vim/minimap and
        Desktop app window prefs live in their own products — not here. Agent
        host path is under Host.
      </p>

      <SettingsSubsection label="Appearance" />
      <SettingsSettingRow
        title="Match editor theme"
        description="The ALTAI webview inherits VS Code / Cursor colors automatically. Change theme from the editor."
      >
        <SurfaceSecondaryAction
          type="button"
          onClick={() => {
            void requestWorkspace("executeAltaiCommand", {
              command: "workbench.action.selectTheme",
            });
          }}
        >
          Select theme
        </SurfaceSecondaryAction>
      </SettingsSettingRow>

      <SettingsSubsection label="Startup & panel" />
      <SettingsSettingRow
        title="Open ALTAI panel on startup"
        description="Reveal the side panel when a trusted workspace activates the extension."
      >
        <SettingsSwitch
          checked={prefs.openPanelOnStartup}
          disabled={busyKey === "openPanelOnStartup"}
          onChange={(v) => void patch("openPanelOnStartup", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Auto-focus composer"
        description="Focus the chat input when the panel becomes visible."
      >
        <SettingsSwitch
          checked={prefs.autoFocusComposer}
          disabled={busyKey === "autoFocusComposer"}
          onChange={(v) => void patch("autoFocusComposer", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Show follow-up hints"
        description="Steer / queue hints under the composer during an active run."
      >
        <SettingsSwitch
          checked={prefs.showFollowupHints}
          disabled={busyKey === "showFollowupHints"}
          onChange={(v) => void patch("showFollowupHints", v)}
        />
      </SettingsSettingRow>

      <SettingsSubsection label="AI" />
      <SettingsSettingRow
        title="Show agent picker"
        description="Display the agent dropdown in the chat toolbar when capabilities allow."
      >
        <SettingsSwitch
          checked={prefs.agentPickerEnabled}
          disabled={busyKey === "agentPickerEnabled"}
          onChange={(v) => void patch("agentPickerEnabled", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Enable bypass permissions mode"
        description="Allow Bypass in the permission control. When active, the agent can auto-approve tools — only enable in trusted sandboxes."
      >
        <SettingsSwitch
          checked={prefs.bypassPermissionsEnabled}
          disabled={busyKey === "bypassPermissionsEnabled"}
          danger
          onChange={(v) => void patch("bypassPermissionsEnabled", v)}
        />
      </SettingsSettingRow>
      {prefs.bypassPermissionsEnabled ? (
        <div className="altai-settings-warning" role="status">
          Bypass skips approval prompts. Disable when you finish high-trust
          agent runs.
        </div>
      ) : null}
      <SettingsSettingRow
        title="Remember permission mode"
        description="Write permission mode changes to the agent host config."
      >
        <SettingsSwitch
          checked={prefs.rememberPermissionMode}
          disabled={busyKey === "rememberPermissionMode"}
          onChange={(v) => void patch("rememberPermissionMode", v)}
        />
      </SettingsSettingRow>

      <div className="altai-settings-field-actions">
        <SurfaceSecondaryAction
          type="button"
          onClick={() =>
            void requestWorkspace("executeAltaiCommand", {
              command: "altai.openExtensionSettings",
            })
          }
        >
          Native settings editor
        </SurfaceSecondaryAction>
        <SurfaceSecondaryAction type="button" onClick={() => void reload()}>
          Refresh
        </SurfaceSecondaryAction>
      </div>
    </div>
  );
}

export function ChatSettingsModelsPanel({
  requestWorkspace,
}: {
  requestWorkspace?: WorkspaceBridge;
}) {
  const ports = useHostPorts();
  const extensionPrefs = useOptionalExtensionPreferences(requestWorkspace);
  const canList = useCapability("models.list");
  const canSelect = useCapability("models.select");
  const canGet = useCapability("settings.get");
  const canUpdate = useCapability("settings.update");
  const canProvider = useCapability("settings.providerStatus");
  const canPermission = useCapability("interactive.permissionModes");
  const canModel = canMountModelPicker({
    list: canList,
    select: canSelect,
    settingsGet: canGet,
  });
  const [fallbackId, setFallbackId] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providerCount, setProviderCount] = useState<{
    total: number;
    connected: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allowBypassPref = extensionPrefs?.bypassPermissionsEnabled ?? false;

  const reload = useCallback(async () => {
    if (!canGet && !canProvider) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tasks: Promise<void>[] = [];
      if (canGet) {
        tasks.push(
          (async () => {
            const settings = await ports.settings.getSettings();
            setFallbackId(settings.fallbackModelId ?? "");
            if (canList) {
              setModels(mergeModelCatalog(await ports.settings.listModels()));
            }
          })(),
        );
      }
      if (canProvider) {
        tasks.push(
          (async () => {
            const providers = await ports.settings.getProviderStatus();
            const merged = mergeProviderCatalog(providers);
            const cloud = merged.filter(
              (p) => !knownProviderById(p.providerId)?.keyless,
            );
            setProviderCount({
              total: cloud.length,
              connected: cloud.filter((p) => p.connected).length,
            });
          })(),
        );
      }
      await Promise.all(tasks);
    } catch (err) {
      setError(formatHostUserError(err));
    } finally {
      setBusy(false);
    }
  }, [ports, canGet, canList, canProvider]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setFallback = useCallback(
    async (id: string) => {
      if (!canUpdate) {
        return;
      }
      setError(null);
      try {
        const next = await ports.settings.updateSettings({
          fallbackModelId: id,
        });
        setFallbackId(next.fallbackModelId ?? "");
      } catch (err) {
        setError(formatHostUserError(err));
      }
    },
    [ports, canUpdate],
  );

  return (
    <div className="altai-settings-stack">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="altai-settings-stat-row">
        <div className="altai-settings-stat">
          <span className="altai-settings-stat-value">
            {models.length || "—"}
          </span>
          <span className="altai-settings-stat-label">Models</span>
        </div>
        <div className="altai-settings-stat">
          <span className="altai-settings-stat-value">
            {providerCount
              ? `${providerCount.connected}/${providerCount.total}`
              : "—"}
          </span>
          <span className="altai-settings-stat-label">Providers</span>
        </div>
        <div className="altai-settings-stat">
          <span className="altai-settings-stat-value">
            {fallbackId ? "On" : "Off"}
          </span>
          <span className="altai-settings-stat-label">Failover</span>
        </div>
        <SurfaceSecondaryAction
          type="button"
          disabled={busy}
          onClick={() => void reload()}
        >
          {busy ? "…" : "Refresh"}
        </SurfaceSecondaryAction>
      </div>

      <SettingsSubsection label="API keys" />
      {canProvider ? (
        <ChatProviderStatusChrome
          layout="settings"
          requestWorkspace={requestWorkspace}
          onProvidersChanged={() => void reload()}
        />
      ) : (
        <p className="altai-shell-meta">Provider status unavailable.</p>
      )}

      <SettingsSubsection label="Default model" />
      {canModel ? (
        <ChatModelPickerChrome layout="settings" />
      ) : (
        <p className="altai-shell-meta">
          Connect a provider and wait for models.list + settings.get.
        </p>
      )}

      <SettingsSubsection label="Failover model" />
      <SettingsSettingRow
        title="When primary is exhausted"
        description="Optional. Host retries this model on rate limit / outage (stored as fallback_model)."
        stacked
      >
        <select
          className="altai-settings-input"
          value={fallbackId}
          disabled={!canUpdate}
          onChange={(e) => {
            void setFallback(e.target.value);
          }}
        >
          <option value="">None (no failover)</option>
          {models
            .filter((model) => model.id !== "auto")
            .map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} · {model.providerId}
            </option>
          ))}
        </select>
      </SettingsSettingRow>

      <SettingsSubsection label="Permission mode" />
      {canPermission ? (
        <ChatPermissionModeChrome
          variant="toolbar"
          showBypassAlways={allowBypassPref}
        />
      ) : (
        <p className="altai-shell-meta">Permission modes unavailable.</p>
      )}
      {extensionPrefs && !extensionPrefs.bypassPermissionsEnabled ? (
        <p className="altai-settings-row-desc">
          Enable “Bypass permissions mode” under General → AI to offer bypass
          here and in the composer.
        </p>
      ) : null}
    </div>
  );
}

function useOptionalExtensionPreferences(
  requestWorkspace?: WorkspaceBridge,
): ExtensionPreferences | null {
  const [prefs, setPrefs] = useState<ExtensionPreferences | null>(null);
  useEffect(() => {
    if (!requestWorkspace) {
      setPrefs(null);
      return;
    }
    let cancelled = false;
    void requestWorkspace("getExtensionSettings")
      .then((raw) => {
        if (!cancelled) {
          setPrefs(
            coerceExtensionPreferences(raw as Record<string, unknown>),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrefs(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [requestWorkspace]);
  return prefs;
}

export function ChatSettingsContextPanel({
  requestWorkspace,
  activeChatId,
}: {
  requestWorkspace: WorkspaceBridge;
  activeChatId?: string | null;
}) {
  const ports = useHostPorts();
  const canGet = useCapability("settings.get");
  const canUpdate = useCapability("settings.update");
  const { prefs, error, busyKey, patch } =
    useExtensionPreferences(requestWorkspace);
  const [autoCompact, setAutoCompact] = useState(true);
  const [hostError, setHostError] = useState<string | null>(null);
  const [ignoreText, setIgnoreText] = useState("");
  const [ignoreUri, setIgnoreUri] = useState<string | null>(null);
  const [ignoreDirty, setIgnoreDirty] = useState(false);
  const [ignoreBusy, setIgnoreBusy] = useState(false);
  const [ignoreMsg, setIgnoreMsg] = useState<string | null>(null);
  const [compactMsg, setCompactMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!canGet) {
      return;
    }
    let cancelled = false;
    void ports.settings
      .getSettings()
      .then((settings) => {
        if (!cancelled) {
          setAutoCompact(settings.compactionEnabled !== false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHostError(formatHostUserError(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ports, canGet]);

  const loadIgnore = useCallback(async () => {
    setIgnoreMsg(null);
    try {
      const workspace = (await requestWorkspace("getWorkspace")) as {
        roots?: string[];
        currentDir?: string;
      };
      const root =
        workspace.currentDir ||
        (workspace.roots?.[0]
          ? workspace.roots[0].replace(/^file:\/\//, "")
          : "");
      if (!root) {
        setIgnoreUri(null);
        setIgnoreText("");
        return;
      }
      const uri = root.startsWith("file:")
        ? `${root.replace(/\/$/, "")}/.isanagentignore`
        : pathToFileUri(`${root.replace(/\/$/, "")}/.isanagentignore`);
      setIgnoreUri(uri);
      try {
        const file = (await requestWorkspace("readFile", { uri })) as {
          text?: string;
        };
        setIgnoreText(typeof file.text === "string" ? file.text : "");
      } catch {
        setIgnoreText("");
      }
      setIgnoreDirty(false);
    } catch (err) {
      setIgnoreMsg(formatHostUserError(err));
    }
  }, [requestWorkspace]);

  useEffect(() => {
    void loadIgnore();
  }, [loadIgnore]);

  const saveIgnore = useCallback(async () => {
    if (!ignoreUri) {
      return;
    }
    setIgnoreBusy(true);
    setIgnoreMsg(null);
    try {
      await requestWorkspace("writeTextFile", {
        uri: ignoreUri,
        text: ignoreText,
      });
      setIgnoreDirty(false);
      setIgnoreMsg("Saved .isanagentignore");
    } catch (err) {
      setIgnoreMsg(formatHostUserError(err));
    } finally {
      setIgnoreBusy(false);
    }
  }, [requestWorkspace, ignoreUri, ignoreText]);

  return (
    <div className="altai-settings-stack">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      {hostError ? (
        <p className="altai-chat-error" role="alert">
          {hostError}
        </p>
      ) : null}

      <SettingsSubsection label="Context condensing" />
      <SettingsSettingRow
        title="Auto-compaction"
        description="When the conversation approaches the context window, summarize older history. Manual compact still works from the composer."
      >
        <SettingsSwitch
          checked={autoCompact}
          disabled={!canUpdate}
          onChange={(next) => {
            setAutoCompact(next);
            void ports.settings
              .updateSettings({ compactionEnabled: next })
              .then((settings) => {
                setAutoCompact(settings.compactionEnabled !== false);
              })
              .catch((err: unknown) => {
                setHostError(formatHostUserError(err));
              });
          }}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Threshold (% of context window)"
        description="Optional. Empty uses the absolute token value below."
      >
        <input
          className="altai-settings-input altai-settings-input--narrow"
          type="number"
          min={1}
          max={100}
          value={prefs.compactionThresholdPercent ?? ""}
          disabled={busyKey === "compactionThresholdPercent"}
          placeholder="—"
          onChange={(e) => {
            const raw = e.target.value.trim();
            void patch(
              "compactionThresholdPercent",
              raw === "" ? null : Number(raw),
            );
          }}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Threshold (tokens)"
        description="Absolute budget when no percent is set."
      >
        <input
          className="altai-settings-input altai-settings-input--narrow"
          type="number"
          min={8000}
          step={1000}
          value={prefs.compactionThresholdTokens}
          disabled={busyKey === "compactionThresholdTokens"}
          onChange={(e) => {
            void patch("compactionThresholdTokens", Number(e.target.value));
          }}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Recent turns to keep"
        description="Tool summaries preserved verbatim during compaction."
      >
        <input
          className="altai-settings-input altai-settings-input--narrow"
          type="number"
          min={0}
          max={50}
          value={prefs.compactionTailTurns}
          disabled={busyKey === "compactionTailTurns"}
          onChange={(e) => {
            void patch("compactionTailTurns", Number(e.target.value));
          }}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Prune old tool results"
        description="Collapse completed tool outputs outside the recency window in the UI history."
      >
        <SettingsSwitch
          checked={prefs.compactionPrune}
          disabled={busyKey === "compactionPrune"}
          onChange={(v) => void patch("compactionPrune", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Prune recency window (tokens)"
        description="Trailing budget the prune pass keeps (~4 chars/token estimate)."
      >
        <input
          className="altai-settings-input altai-settings-input--narrow"
          type="number"
          min={1000}
          step={1000}
          value={prefs.compactionPruneRecencyTokens}
          disabled={busyKey === "compactionPruneRecencyTokens"}
          onChange={(e) => {
            void patch("compactionPruneRecencyTokens", Number(e.target.value));
          }}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Compact active chat now"
        description={
          activeChatId
            ? "Runs host runtime.compactContext on the focused chat."
            : "Open a chat first, then return here to compact its context."
        }
      >
        <ChatComposerCompact
          chatId={activeChatId ?? null}
          onCompacted={() => {
            setCompactMsg("Context compaction requested for the active chat.");
          }}
          onError={(message) => {
            setCompactMsg(message);
          }}
        />
      </SettingsSettingRow>
      {compactMsg ? (
        <p className="altai-shell-meta" role="status">
          {compactMsg}
        </p>
      ) : null}

      <SettingsSubsection label=".isanagentignore" />
      <div className="altai-settings-row altai-settings-row--stacked">
        <div className="altai-settings-row-copy">
          <span className="altai-settings-row-title">
            Workspace ignore file
          </span>
          <span className="altai-settings-row-desc">
            Gitignore syntax at the project root. Filters ALTAI-assisted file
            search and attach surfaces in this host.
          </span>
        </div>
        <textarea
          className="altai-settings-textarea"
          spellCheck={false}
          value={ignoreText}
          placeholder={IGNORE_HELP}
          disabled={!ignoreUri || ignoreBusy}
          onChange={(e) => {
            setIgnoreText(e.target.value);
            setIgnoreDirty(true);
          }}
        />
        <div className="altai-settings-field-actions">
          <SurfaceSecondaryAction
            type="button"
            disabled={!ignoreUri || ignoreBusy || !ignoreDirty}
            onClick={() => void saveIgnore()}
          >
            {ignoreBusy ? "Saving…" : "Save"}
          </SurfaceSecondaryAction>
          <SurfaceSecondaryAction
            type="button"
            onClick={() => void loadIgnore()}
          >
            Reload
          </SurfaceSecondaryAction>
          {ignoreUri ? (
            <SurfaceSecondaryAction
              type="button"
              onClick={() =>
                void requestWorkspace("openFile", { uri: ignoreUri })
              }
            >
              Open in editor
            </SurfaceSecondaryAction>
          ) : null}
        </div>
        {ignoreMsg ? (
          <p className="altai-shell-meta" role="status">
            {ignoreMsg}
          </p>
        ) : null}
        {!ignoreUri ? (
          <p className="altai-shell-meta">
            Open a workspace folder to edit .isanagentignore.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ChatSettingsAgentsPanel({
  requestWorkspace,
}: {
  requestWorkspace: WorkspaceBridge;
}) {
  const { prefs, ready, error, busyKey, patch } =
    useExtensionPreferences(requestWorkspace);
  const snippets = useMemo(
    () => parseSnippetsJson(prefs.snippetsJson),
    [prefs.snippetsJson],
  );
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [draftHandle, setDraftHandle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  useEffect(() => {
    if (ready) {
      setInstructionsDraft(prefs.customInstructions);
    }
  }, [ready, prefs.customInstructions]);

  if (!ready) {
    return <p className="altai-shell-meta">{error ?? "Loading…"}</p>;
  }

  const saveSnippets = (next: SnippetPref[]) => {
    void patch("snippetsJson", serializeSnippets(next));
  };

  return (
    <div className="altai-settings-stack">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsSubsection label="Custom instructions" />
      <div className="altai-settings-row altai-settings-row--stacked">
        <div className="altai-settings-row-copy">
          <span className="altai-settings-row-title">Always-on guidance</span>
          <span className="altai-settings-row-desc">
            Extra system guidance for this machine (Studio Agents). Stored in
            VS Code settings — not secrets.
          </span>
        </div>
        <textarea
          className="altai-settings-textarea"
          rows={6}
          value={instructionsDraft}
          disabled={busyKey === "customInstructions"}
          placeholder="e.g. Prefer TypeScript. Never commit secrets."
          onChange={(e) => setInstructionsDraft(e.target.value)}
          onBlur={() => {
            if (instructionsDraft !== prefs.customInstructions) {
              void patch("customInstructions", instructionsDraft);
            }
          }}
        />
      </div>

      <SettingsSubsection label="Snippets (#handle)" />
      <p className="altai-settings-row-desc">
        Reusable blocks inserted via #handle in the composer. Stored as JSON in
        extension settings.
      </p>
      <ul className="altai-settings-snippet-list">
        {snippets.length === 0 ? (
          <li className="altai-shell-meta">No custom snippets yet.</li>
        ) : (
          snippets.map((snippet) => (
            <li key={snippet.id} className="altai-settings-snippet-row">
              <code>#{snippet.handle}</code>
              <span className="altai-settings-row-desc">
                {snippet.body.slice(0, 80)}
                {snippet.body.length > 80 ? "…" : ""}
              </span>
              <SurfaceSecondaryAction
                type="button"
                onClick={() => {
                  saveSnippets(snippets.filter((s) => s.id !== snippet.id));
                }}
              >
                Delete
              </SurfaceSecondaryAction>
            </li>
          ))
        )}
      </ul>
      <div className="altai-settings-row altai-settings-row--stacked">
        <input
          className="altai-settings-input"
          placeholder="handle (no #)"
          value={draftHandle}
          onChange={(e) => setDraftHandle(e.target.value)}
        />
        <textarea
          className="altai-settings-textarea"
          placeholder="Snippet body"
          rows={3}
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
        />
        <SurfacePrimaryAction
          type="button"
          disabled={!draftHandle.trim() || !draftBody.trim()}
          onClick={() => {
            const handle = draftHandle.trim().replace(/^#/, "");
            saveSnippets([
              ...snippets,
              {
                id: `snippet-${Date.now()}`,
                handle,
                body: draftBody,
              },
            ]);
            setDraftHandle("");
            setDraftBody("");
          }}
        >
          Add snippet
        </SurfacePrimaryAction>
      </div>
    </div>
  );
}

export function ChatSettingsAccessibilityPanel({
  requestWorkspace,
}: {
  requestWorkspace: WorkspaceBridge;
}) {
  const { prefs, ready, error, busyKey, patch } =
    useExtensionPreferences(requestWorkspace);
  if (!ready) {
    return <p className="altai-shell-meta">{error ?? "Loading…"}</p>;
  }
  return (
    <div className="altai-settings-stack">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      <SettingsSubsection label="Motion & visuals" />
      <SettingsSettingRow
        title="Reduce motion"
        description="Prefer fewer animations in the ALTAI panel (system / always / never)."
      >
        <select
          className="altai-settings-input altai-settings-input--narrow"
          value={prefs.reduceMotion}
          disabled={busyKey === "reduceMotion"}
          onChange={(e) => void patch("reduceMotion", e.target.value)}
        >
          <option value="system">System</option>
          <option value="always">Always</option>
          <option value="never">Never</option>
        </select>
      </SettingsSettingRow>
      <SettingsSettingRow
        title="High contrast"
        description="Strengthen muted text and borders for WCAG-friendly contrast."
      >
        <SettingsSwitch
          checked={prefs.highContrast}
          disabled={busyKey === "highContrast"}
          onChange={(v) => void patch("highContrast", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Larger interface text"
        description="Bump root font size in the ALTAI webview (~10%)."
      >
        <SettingsSwitch
          checked={prefs.largerText}
          disabled={busyKey === "largerText"}
          onChange={(v) => void patch("largerText", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Always underline links"
        description="Make text links perceivable without relying on color alone."
      >
        <SettingsSwitch
          checked={prefs.underlineLinks}
          disabled={busyKey === "underlineLinks"}
          onChange={(v) => void patch("underlineLinks", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow title="Focus ring" description="Keyboard focus outline strength.">
        <select
          className="altai-settings-input altai-settings-input--narrow"
          value={prefs.focusRing}
          disabled={busyKey === "focusRing"}
          onChange={(e) => void patch("focusRing", e.target.value)}
        >
          <option value="default">Default</option>
          <option value="strong">Strong</option>
        </select>
      </SettingsSettingRow>

      <SettingsSubsection label="Screen reader" />
      <SettingsSettingRow
        title="Chat announcements"
        description="ARIA live region for streaming assistant text."
      >
        <select
          className="altai-settings-input altai-settings-input--narrow"
          value={prefs.chatAnnounce}
          disabled={busyKey === "chatAnnounce"}
          onChange={(e) => void patch("chatAnnounce", e.target.value)}
        >
          <option value="off">Off</option>
          <option value="polite">Polite</option>
          <option value="assertive">Assertive</option>
        </select>
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Assertive approval prompts"
        description="Announce interactive approvals with higher interrupt priority."
      >
        <SettingsSwitch
          checked={prefs.approvalAnnounceAssertive}
          disabled={busyKey === "approvalAnnounceAssertive"}
          onChange={(v) => void patch("approvalAnnounceAssertive", v)}
        />
      </SettingsSettingRow>
      <SettingsSettingRow
        title="Show skip links"
        description="Surface skip-to-composer style affordances when applicable."
      >
        <SettingsSwitch
          checked={prefs.showSkipLinks}
          disabled={busyKey === "showSkipLinks"}
          onChange={(v) => void patch("showSkipLinks", v)}
        />
      </SettingsSettingRow>
    </div>
  );
}

export function ChatSettingsShortcutsPanel({
  requestWorkspace,
}: {
  requestWorkspace: WorkspaceBridge;
}) {
  return (
    <div className="altai-settings-stack">
      <p className="altai-settings-row-desc">
        ALTAI shortcuts are contributed through VS Code keybindings. Record or
        remapping happens in the editor — same model as Studio&apos;s Shortcuts
        tab, backed by the host keymap.
      </p>
      <div className="altai-settings-field-actions">
        <SurfacePrimaryAction
          type="button"
          onClick={() =>
            void requestWorkspace("executeAltaiCommand", {
              command: "workbench.action.openGlobalKeybindings",
            })
          }
        >
          Open Keyboard Shortcuts
        </SurfacePrimaryAction>
      </div>
      <ul className="altai-settings-shortcut-list">
        {SHORTCUT_ROWS.map((row) => (
          <li key={row.command} className="altai-settings-row">
            <div className="altai-settings-row-copy">
              <span className="altai-settings-row-title">{row.title}</span>
              <span className="altai-settings-row-desc">
                <code>{row.command}</code>
              </span>
            </div>
            <kbd className="altai-settings-kbd">{row.keys}</kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChatSettingsGithubPanel({
  requestWorkspace,
}: {
  requestWorkspace: WorkspaceBridge;
}) {
  return (
    <div className="altai-settings-stack">
      <SettingsSettingRow
        title="GitHub account"
        description="Studio uses a device-code flow. In VS Code / Cursor, sign in with the built-in GitHub auth provider or the GitHub Pull Requests extension. ALTAI agent git tools then reuse the environment credentials."
        stacked
      >
        <div className="altai-settings-field-actions">
          <SurfacePrimaryAction
            type="button"
            onClick={() =>
              void requestWorkspace("openExternal", {
                href: "https://github.com/login",
              })
            }
          >
            Open GitHub
          </SurfacePrimaryAction>
          <SurfaceSecondaryAction
            type="button"
            onClick={() =>
              void requestWorkspace("openExternal", {
                href: "https://github.com/settings/tokens",
              })
            }
          >
            Personal access tokens
          </SurfaceSecondaryAction>
        </div>
      </SettingsSettingRow>
      <p className="altai-settings-row-desc">
        Private clone / push typically needs{" "}
        <code>gh auth login</code> or VS Code Accounts → GitHub.
      </p>
    </div>
  );
}

export function ChatSettingsLanguagesPanel({
  requestWorkspace,
}: {
  requestWorkspace: WorkspaceBridge;
}) {
  return (
    <div className="altai-settings-stack">
      <SettingsSettingRow
        title="Language servers"
        description="Studio embeds an LSP installer. VS Code and Cursor already run language services via extensions — ALTAI does not ship a second LSP stack."
        stacked
      >
        <div className="altai-settings-field-actions">
          <SurfaceSecondaryAction
            type="button"
            onClick={() =>
              void requestWorkspace("executeAltaiCommand", {
                command: "workbench.action.openSettings",
              })
            }
          >
            Open editor settings
          </SurfaceSecondaryAction>
        </div>
      </SettingsSettingRow>
      <p className="altai-settings-row-desc">
        Install language extensions from the marketplace (TypeScript,
        rust-analyzer, pyright, …). Diagnostics feed ALTAI context via{" "}
        <code>altai.askAboutProblems</code>.
      </p>
    </div>
  );
}

export function ChatSettingsHooksPanel({
  requestWorkspace,
}: {
  requestWorkspace: WorkspaceBridge;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const workspace = (await requestWorkspace("getWorkspace")) as {
        roots?: string[];
        currentDir?: string;
      };
      const root = workspace.currentDir
        ? pathToFileUri(workspace.currentDir)
        : workspace.roots?.[0];
      if (!root) {
        setContent(null);
        setUri(null);
        setError("Open a workspace to inspect lifecycle hooks.");
        return;
      }
      const workflowUri = joinUri(root, "WORKFLOW.md");
      setUri(workflowUri);
      try {
        const file = (await requestWorkspace("readFile", {
          uri: workflowUri,
        })) as { text?: string };
        setContent(typeof file.text === "string" ? file.text : "");
      } catch {
        setContent(null);
        setError(
          "No WORKFLOW.md at the project root. Create one to define project hooks (Studio reads the same file).",
        );
      }
    } catch (err) {
      setError(formatHostUserError(err));
    }
  }, [requestWorkspace]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="altai-settings-stack">
      <div className="altai-settings-warning" role="note">
        Lifecycle hooks are read-only here. Edit WORKFLOW.md (or managed hook
        definitions) in the workspace — same source of truth as Studio.
      </div>
      <div className="altai-settings-field-actions">
        <SurfaceSecondaryAction type="button" onClick={() => void load()}>
          Refresh
        </SurfaceSecondaryAction>
        {uri ? (
          <SurfaceSecondaryAction
            type="button"
            onClick={() => void requestWorkspace("openFile", { uri })}
          >
            Open WORKFLOW.md
          </SurfaceSecondaryAction>
        ) : null}
      </div>
      {error ? (
        <p className="altai-shell-meta" role="status">
          {error}
        </p>
      ) : null}
      {content !== null ? (
        <pre className="altai-settings-pre">{content || "(empty file)"}</pre>
      ) : null}
    </div>
  );
}

export function ChatSettingsMcpPanel() {
  const canMcp = useCapability("mcp.list");
  if (!canMcp) {
    return (
      <p className="altai-shell-meta">
        MCP list is not advertised by the host. Start a trusted workspace host
        that supports mcp.list.
      </p>
    );
  }
  return <ChatMcpStatusChrome defaultOpen layout="settings" />;
}

export function ChatSettingsSkillsPanel() {
  const canSkills = useCapability("skills.list");
  if (!canSkills) {
    return (
      <p className="altai-shell-meta">
        skills.list is not available on this host yet.
      </p>
    );
  }
  return <ChatSkillsStatusChrome defaultOpen layout="settings" />;
}

function joinUri(baseUri: string, segment: string): string {
  const base = baseUri.replace(/\/$/, "");
  if (base.startsWith("file://")) {
    return `${base}/${segment}`;
  }
  return pathToFileUri(`${base.replace(/^file:\/\//, "")}/${segment}`);
}
