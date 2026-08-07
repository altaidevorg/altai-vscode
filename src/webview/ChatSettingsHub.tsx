/**
 * Studio SettingsContent surface for VS Code — search, sticky section, and
 * full Studio tab bodies.
 */

import { SurfaceSecondaryAction, useCapability } from "@altai/agent-ui";
import {
  AiBookIcon,
  CodeSquareIcon,
  ComputerIcon,
  GithubIcon,
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
import { recoveryHintForDiagnosticCode } from "../shared/hostRecovery.js";
import { ChatHostSettingsChrome } from "./ChatHostSettingsChrome.js";
import {
  ChatSettingsAccessibilityPanel,
  ChatSettingsAgentsPanel,
  ChatSettingsContextPanel,
  ChatSettingsGeneralPanel,
  ChatSettingsGithubPanel,
  ChatSettingsHooksPanel,
  ChatSettingsLanguagesPanel,
  ChatSettingsMcpPanel,
  ChatSettingsModelsPanel,
  ChatSettingsShortcutsPanel,
  ChatSettingsSkillsPanel,
} from "./ChatStudioSettingsPanels.js";
import { listRecoveryActions } from "./hostRecoveryActions.js";
import {
  listSettingsHubNav,
  normalizeSettingsHubSection,
  type SettingsHubSectionId,
} from "./settingsHubChrome.js";
import { filterSettingsNav } from "./settingsSearchChrome.js";
import { SettingsSectionShell } from "./settingsSectionLayout.js";
import { formatDiagnosticClipboardText } from "./waitShellChrome.js";

export { listSettingsHubSections } from "./settingsHubChrome.js";

const SECTION_ICONS = {
  general: Settings01Icon,
  shortcuts: KeyboardIcon,
  models: AiBookIcon,
  context: Layers02Icon,
  agents: UserMultiple02Icon,
  skills: PuzzleIcon,
  github: GithubIcon,
  languages: CodeSquareIcon,
  mcp: PlugIcon,
  hooks: CodeSquareIcon,
  accessibility: UniversalAccessIcon,
  host: ComputerIcon,
  about: InformationCircleIcon,
} as const;

const QUICK_JUMP: SettingsHubSectionId[] = [
  "models",
  "context",
  "agents",
  "mcp",
  "accessibility",
  "host",
];

export type ChatSettingsHubProps = {
  extensionVersion?: string;
  hostStatusLabel?: string;
  diagnosticCode?: string;
  hostMessage?: string;
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
  /** Restored section when reopening Settings. */
  initialSection?: string;
  /** Persist section across reloads. */
  onSectionChange?: (section: SettingsHubSectionId) => void;
  /** Deep-link focus from open-settings events. */
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
  const canProvider = useCapability("settings.providerStatus");
  const canListModels = useCapability("models.list");
  const canGetSettings = useCapability("settings.get");
  const canMcp = useCapability("mcp.list");
  const canSkills = useCapability("skills.list");
  const hostReady = hostStatusLabel === "ready";

  const nav = useMemo(
    () =>
      listSettingsHubNav({
        canProvider,
        canModel: canListModels && canGetSettings,
        canPermission: canGetSettings,
        canCompaction: canGetSettings,
        canMcp,
        canSkills,
      }),
    [canProvider, canListModels, canGetSettings, canMcp, canSkills],
  );
  const availableIds = useMemo(() => nav.map((item) => item.id), [nav]);
  const [section, setSection] = useState<SettingsHubSectionId>(() =>
    normalizeSettingsHubSection(initialSection, availableIds),
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSection((current) =>
      normalizeSettingsHubSection(current, availableIds),
    );
  }, [availableIds]);

  useEffect(() => {
    if (focusKey === undefined) {
      return;
    }
    if (focusSection) {
      setSection(normalizeSettingsHubSection(focusSection, availableIds));
    }
  }, [focusKey, focusSection, availableIds]);

  const selectSection = (next: SettingsHubSectionId) => {
    setSection(next);
    onSectionChange?.(next);
  };

  const visibleNav = useMemo(
    () => filterSettingsNav(nav, query),
    [nav, query],
  );

  const activeNav = nav.find((item) => item.id === section) ?? nav[0];
  const recoveryActions = listRecoveryActions({ diagnosticCode });
  const clipboardText = formatDiagnosticClipboardText({
    diagnosticCode,
    message: hostMessage,
    recoveryHint: recoveryHintForDiagnosticCode(diagnosticCode),
  });
  const versionLabel = extensionVersion?.trim() || "unknown";
  const rw = requestWorkspace;

  const hostBadge = !hostReady
    ? "Host offline — live agent configs may be limited"
    : null;

  return (
    <section className="altai-settings-hub" aria-label="ALTAI settings">
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

      {hostBadge ? (
        <p className="altai-settings-hub-banner" role="status">
          {hostBadge}
        </p>
      ) : null}

      <div className="altai-settings-hub-quick" aria-label="Quick jump">
        {QUICK_JUMP.map((id) => {
          const item = nav.find((entry) => entry.id === id);
          if (!item) {
            return null;
          }
          return (
            <button
              key={id}
              type="button"
              className={
                section === id
                  ? "altai-settings-hub-chip is-active"
                  : "altai-settings-hub-chip"
              }
              onClick={() => selectSection(id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className="altai-settings-hub-tabbar"
        role="tablist"
        aria-label="Settings sections"
      >
        {visibleNav.length === 0 ? (
          <span className="altai-shell-meta px-2">No sections match.</span>
        ) : (
          visibleNav.map((item) => {
            const active = item.id === section;
            const Icon = SECTION_ICONS[item.id];
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={
                  active
                    ? "altai-settings-hub-nav-item is-active"
                    : "altai-settings-hub-nav-item"
                }
                onClick={() => selectSection(item.id)}
              >
                <HugeiconsIcon icon={Icon} size={12} strokeWidth={1.75} />
                <span>{item.label}</span>
              </button>
            );
          })
        )}
      </div>

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
          {section === "github" && rw ? (
            <ChatSettingsGithubPanel requestWorkspace={rw} />
          ) : null}
          {section === "languages" && rw ? (
            <ChatSettingsLanguagesPanel requestWorkspace={rw} />
          ) : null}
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
            Thin host for the shared agent UI and IsanAgent runtime — Studio
            settings surface.
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
