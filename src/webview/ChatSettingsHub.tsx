/**
 * Plugin settings hub — single sidebar nav, plugin-only catalog.
 * Not a clone of Desktop app or Desktop IDE SettingsContent.
 */

import { SurfaceSecondaryAction } from "@altai/agent-ui";
import {
  AiBookIcon,
  CodeSquareIcon,
  ComputerIcon,
  InformationCircleIcon,
  KeyboardIcon,
  Layers02Icon,
  PlugIcon,
  PuzzleIcon,
  Search01Icon,
  Settings01Icon,
  UniversalAccessIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { recoveryHintForDiagnosticCode } from "@altai/agent-ui";
import { ChatHostSettingsChrome } from "./ChatHostSettingsChrome.js";
import {
  ChatSettingsAccessibilityPanel,
  ChatSettingsAgentsPanel,
  ChatSettingsContextPanel,
  ChatSettingsGeneralPanel,
  ChatSettingsHooksPanel,
  ChatSettingsMcpPanel,
  ChatSettingsModelsPanel,
  ChatSettingsShortcutsPanel,
  ChatSettingsSkillsPanel,
} from "./ChatStudioSettingsPanels.js";
import { listRecoveryActions } from "./hostRecoveryActions.js";
import { SettingsSectionShell } from "./settingsSectionLayout.js";
import {
  filterPluginSettingsNav,
  groupPluginSettingsNav,
  normalizePluginSettingsSection,
  PLUGIN_SETTINGS_GROUP_LABELS,
  PLUGIN_SETTINGS_NAV,
  type SettingsHubSectionId,
} from "./pluginSettingsChrome.js";
import { formatDiagnosticClipboardText } from "./waitShellChrome.js";

const SECTION_ICONS = {
  general: Settings01Icon,
  shortcuts: KeyboardIcon,
  models: AiBookIcon,
  context: Layers02Icon,
  agents: UserMultiple02Icon,
  skills: PuzzleIcon,
  mcp: PlugIcon,
  hooks: CodeSquareIcon,
  accessibility: UniversalAccessIcon,
  host: ComputerIcon,
  about: InformationCircleIcon,
} as const;

export type ChatSettingsHubProps = {
  extensionVersion?: string;
  hostStatusLabel?: string;
  diagnosticCode?: string;
  hostMessage?: string;
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
  initialSection?: string;
  onSectionChange?: (section: SettingsHubSectionId) => void;
  focusSection?: string;
  focusKey?: number;
  activeChatId?: string | null;
};

export function ChatSettingsHub({
  extensionVersion,
  hostStatusLabel,
  diagnosticCode,
  hostMessage,
  requestWorkspace,
  initialSection,
  onSectionChange,
  focusSection,
  focusKey,
  activeChatId,
}: ChatSettingsHubProps) {
  const hostReady = hostStatusLabel === "ready";
  const [section, setSection] = useState<SettingsHubSectionId>(() =>
    normalizePluginSettingsSection(initialSection),
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (focusKey === undefined) {
      return;
    }
    if (focusSection) {
      setSection(normalizePluginSettingsSection(focusSection));
    }
  }, [focusKey, focusSection]);

  const selectSection = (next: SettingsHubSectionId) => {
    setSection(next);
    onSectionChange?.(next);
  };

  const visibleNav = useMemo(
    () => filterPluginSettingsNav(query),
    [query],
  );
  const groupedNav = useMemo(
    () => groupPluginSettingsNav(visibleNav),
    [visibleNav],
  );

  const activeNav =
    PLUGIN_SETTINGS_NAV.find((item) => item.id === section) ??
    PLUGIN_SETTINGS_NAV[0];
  const recoveryActions = listRecoveryActions({ diagnosticCode });
  const clipboardText = formatDiagnosticClipboardText({
    diagnosticCode,
    message: hostMessage,
    recoveryHint: recoveryHintForDiagnosticCode(diagnosticCode),
  });
  const versionLabel = extensionVersion?.trim() || "unknown";
  const rw = requestWorkspace;

  return (
    <section className="altai-settings-hub" aria-label="ALTAI extension settings">
      <header className="altai-settings-hub-header">
        <div>
          <h1 className="altai-settings-hub-title">Extension settings</h1>
          <p className="altai-settings-hub-subtitle">
            Panel, agent host, and VS Code–specific preferences — not Desktop
            IDE editor settings.
          </p>
        </div>
        <div className="altai-settings-hub-search">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={1.75}
            className="altai-settings-hub-search-icon"
          />
          <input
            className="altai-settings-hub-search-input"
            type="search"
            value={query}
            placeholder="Search settings…"
            aria-label="Search settings"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="altai-settings-hub-search-clear"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          ) : null}
        </div>
      </header>

      {!hostReady ? (
        <p className="altai-settings-hub-banner" role="status">
          Host offline — live agent configs may be limited
        </p>
      ) : null}

      <div className="altai-settings-hub-body">
        <nav
          className="altai-settings-hub-rail"
          aria-label="Settings sections"
        >
          {groupedNav.length === 0 ? (
            <span className="altai-shell-meta">No sections match.</span>
          ) : (
            groupedNav.map((block) => (
              <div key={block.group} className="altai-settings-hub-group">
                <div className="altai-settings-hub-group-label">
                  {PLUGIN_SETTINGS_GROUP_LABELS[block.group]}
                </div>
                <ul className="altai-settings-hub-rail-list">
                  {block.items.map((item) => {
                    const active = item.id === section;
                    const Icon = SECTION_ICONS[item.id as keyof typeof SECTION_ICONS];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={active ? "page" : undefined}
                          className={
                            active
                              ? "altai-settings-hub-rail-item is-active"
                              : "altai-settings-hub-rail-item"
                          }
                          onClick={() => selectSection(item.id)}
                        >
                          {Icon ? (
                            <HugeiconsIcon
                              icon={Icon}
                              size={13}
                              strokeWidth={1.75}
                            />
                          ) : null}
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>

        <main className="altai-settings-hub-main" data-section={section}>
          <SettingsSectionShell
            title={activeNav?.label ?? "Settings"}
            description={activeNav?.description}
          >
            {section === "general" && rw ? (
              <ChatSettingsGeneralPanel requestWorkspace={rw} />
            ) : null}
            {section === "shortcuts" && rw ? (
              <ChatSettingsShortcutsPanel requestWorkspace={rw} />
            ) : null}
            {section === "models" ? (
              <ChatSettingsModelsPanel requestWorkspace={rw} />
            ) : null}
            {section === "context" && rw ? (
              <ChatSettingsContextPanel
                requestWorkspace={rw}
                activeChatId={activeChatId}
              />
            ) : null}
            {section === "agents" && rw ? (
              <ChatSettingsAgentsPanel requestWorkspace={rw} />
            ) : null}
            {section === "skills" ? <ChatSettingsSkillsPanel /> : null}
            {section === "mcp" ? <ChatSettingsMcpPanel /> : null}
            {section === "hooks" && rw ? (
              <ChatSettingsHooksPanel requestWorkspace={rw} />
            ) : null}
            {section === "accessibility" && rw ? (
              <ChatSettingsAccessibilityPanel requestWorkspace={rw} />
            ) : null}
            {section === "host" && rw ? (
              <ChatHostSettingsChrome
                hostStatusLabel={hostStatusLabel}
                diagnosticCode={diagnosticCode}
                hostMessage={hostMessage}
                requestWorkspace={rw}
              />
            ) : null}
            {section === "about" && rw ? (
              <ChatSettingsAboutPanel
                extensionVersion={versionLabel}
                hostStatusLabel={hostStatusLabel}
                diagnosticCode={diagnosticCode}
                hostMessage={hostMessage}
                clipboardText={clipboardText}
                recoveryActions={recoveryActions}
                requestWorkspace={rw}
              />
            ) : null}
            {section === "about" && !rw ? (
              <p className="altai-shell-meta">
                Extension {versionLabel}
                {hostStatusLabel ? ` · host ${hostStatusLabel}` : ""}
              </p>
            ) : null}
            {!rw &&
            section !== "models" &&
            section !== "mcp" &&
            section !== "skills" &&
            section !== "about" ? (
              <p className="altai-shell-meta">
                Workspace bridge unavailable for this section.
              </p>
            ) : null}
          </SettingsSectionShell>
        </main>
      </div>
    </section>
  );
}

function ChatSettingsAboutPanel({
  extensionVersion,
  hostStatusLabel,
  diagnosticCode,
  hostMessage,
  clipboardText,
  recoveryActions,
  requestWorkspace,
}: {
  extensionVersion: string;
  hostStatusLabel?: string;
  diagnosticCode?: string;
  hostMessage?: string;
  clipboardText: string | null;
  recoveryActions: readonly { command: string; label: string }[];
  requestWorkspace: (method: string, params?: unknown) => Promise<unknown>;
}) {
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  return (
    <div className="altai-settings-stack">
      <div className="altai-settings-about-card">
        <div className="altai-settings-about-mark" aria-hidden>
          A
        </div>
        <div className="altai-settings-about-copy">
          <span className="altai-settings-about-name">ALTAI for VS Code</span>
          <span className="altai-settings-row-desc">
            Editor extension settings for the side panel and agent host — separate
            from the Desktop app and Desktop IDE settings windows.
          </span>
          <span className="altai-settings-about-version">
            v{extensionVersion}
            {hostStatusLabel ? ` · host ${hostStatusLabel}` : ""}
          </span>
        </div>
      </div>
      <dl className="altai-settings-about-meta">
        <div>
          <dt>License</dt>
          <dd>Apache 2.0</dd>
        </div>
        <div>
          <dt>Publisher</dt>
          <dd>altaidevorg</dd>
        </div>
        <div>
          <dt>Docs</dt>
          <dd>
            <button
              type="button"
              className="altai-settings-link-btn"
              onClick={() =>
                void requestWorkspace("openExternal", {
                  href: "https://github.com/altaidevorg/altai-vscode",
                })
              }
            >
              github.com/altaidevorg/altai-vscode
            </button>
          </dd>
        </div>
        {diagnosticCode ? (
          <div>
            <dt>Diagnostic</dt>
            <dd>
              <code>{diagnosticCode}</code>
            </dd>
          </div>
        ) : null}
        {hostMessage?.trim() ? (
          <div className="altai-settings-meta-span">
            <dt>Host message</dt>
            <dd>{hostMessage.trim()}</dd>
          </div>
        ) : null}
      </dl>

      <div className="altai-settings-field-actions altai-settings-field-actions--wrap">
        <SurfaceSecondaryAction
          type="button"
          onClick={() => {
            void requestWorkspace("executeAltaiCommand", {
              command: "altai.openExtensionSettings",
            }).catch(() => undefined);
          }}
        >
          Open VS Code settings: ALTAI
        </SurfaceSecondaryAction>
        <SurfaceSecondaryAction
          type="button"
          onClick={() => {
            void (async () => {
              try {
                const prefs = await requestWorkspace("getExtensionSettings");
                const text = JSON.stringify(
                  {
                    extensionVersion,
                    hostStatus: hostStatusLabel,
                    diagnosticCode,
                    preferences: prefs,
                  },
                  null,
                  2,
                );
                await navigator.clipboard?.writeText(text);
                setExportMsg("Copied preferences diagnostics JSON");
              } catch {
                setExportMsg("Could not copy preferences");
              }
            })();
          }}
        >
          Export prefs JSON
        </SurfaceSecondaryAction>
        {clipboardText ? (
          <SurfaceSecondaryAction
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(clipboardText)
                .catch(() => undefined);
            }}
          >
            Copy diagnostic
          </SurfaceSecondaryAction>
        ) : null}
        {recoveryActions.map((action) => (
          <SurfaceSecondaryAction
            key={action.command}
            type="button"
            onClick={() => {
              void requestWorkspace("executeAltaiCommand", {
                command: action.command,
              }).catch(() => undefined);
            }}
          >
            {action.label}
          </SurfaceSecondaryAction>
        ))}
      </div>
      {exportMsg ? (
        <p className="altai-shell-meta" role="status">
          {exportMsg}
        </p>
      ) : null}
    </div>
  );
}
