/**
 * Capability-gated installed-skills list + optional install form (Chat footer).
 */

import {
  SurfacePrimaryAction,
  SurfaceSecondaryAction,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import {
  canMountSkillsStatus,
  skillsSummaryCopy,
  sortSkillsForDisplay,
  type SkillView,
} from "./skillsStatusChrome.js";

export type ChatSkillsStatusChromeProps = {
  /** Settings hub starts expanded. */
  defaultOpen?: boolean;
  /** Hide collapsible chrome; always show list (Settings hub). */
  layout?: "inline" | "settings";
};

export function ChatSkillsStatusChrome({
  defaultOpen = false,
  layout = "inline",
}: ChatSkillsStatusChromeProps = {}) {
  const ports = useHostPorts();
  const canList = useCapability("skills.list");
  const canInstall = useCapability("skills.install");
  const canShow = canMountSkillsStatus({ skillsList: canList });
  const [skills, setSkills] = useState<SkillView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(defaultOpen || layout === "settings");
  const [source, setSource] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canShow) {
      setSkills([]);
      setReady(false);
      return;
    }
    setError(null);
    try {
      const next = await ports.mcpSkills.listSkills();
      setSkills(
        sortSkillsForDisplay(
          next.map((skill) => ({
            name: skill.name,
            ...(skill.description ? { description: skill.description } : {}),
            ...(skill.enabled !== undefined ? { enabled: skill.enabled } : {}),
          })),
        ),
      );
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setReady(false);
    }
  }, [ports, canShow]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canShow) {
    return null;
  }

  async function install() {
    const trimmed = source.trim();
    if (!canInstall || !trimmed || installing) {
      return;
    }
    setInstalling(true);
    setInstallMessage(null);
    setError(null);
    try {
      const skill = await ports.mcpSkills.installSkill(trimmed);
      setInstallMessage(`Installed ${skill.name}`);
      setSource("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section
      className={
        layout === "settings"
          ? "altai-skills-status altai-skills-status--settings"
          : "altai-skills-status"
      }
      aria-label="Skills"
    >
      <div className="altai-mcp-status-header">
        {layout === "settings" ? (
          <span className="altai-mcp-status-title">
            {ready ? skillsSummaryCopy(skills) : "Skills"}
          </span>
        ) : (
          <button
            type="button"
            className="altai-mcp-status-toggle"
            aria-expanded={open}
            onClick={() => {
              setOpen((value) => !value);
            }}
          >
            <span className="altai-mcp-status-title">
              {ready ? skillsSummaryCopy(skills) : "Skills"}
            </span>
          </button>
        )}
        <SurfaceSecondaryAction
          type="button"
          onClick={() => {
            void load();
          }}
        >
          Refresh
        </SurfaceSecondaryAction>
      </div>
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      {installMessage ? (
        <p className="altai-shell-meta" role="status">
          {installMessage}
        </p>
      ) : null}
      {open || layout === "settings" ? (
        <>
          {canInstall ? (
            <div className="altai-skills-install">
              <label className="altai-skills-install-label" htmlFor="altai-skill-source">
                Install from GitHub
              </label>
              <div className="altai-skills-install-row">
                <input
                  id="altai-skill-source"
                  className="altai-skills-install-input"
                  type="text"
                  value={source}
                  placeholder="owner/repo or owner/repo#skill"
                  disabled={installing}
                  onChange={(event) => {
                    setSource(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void install();
                    }
                  }}
                />
                <SurfacePrimaryAction
                  type="button"
                  disabled={installing || source.trim().length === 0}
                  onClick={() => {
                    void install();
                  }}
                >
                  {installing ? "Installing…" : "Install"}
                </SurfacePrimaryAction>
              </div>
            </div>
          ) : null}
          <ul className="altai-mcp-status-list">
            {!ready && !error ? (
              <li className="altai-shell-meta">Loading skills…</li>
            ) : null}
            {ready && skills.length === 0 ? (
              <li className="altai-shell-meta">No skills installed in this workspace.</li>
            ) : null}
            {skills.map((skill) => (
              <li key={skill.name} className="altai-mcp-status-row">
                <div className="altai-mcp-status-meta">
                  <span className="altai-mcp-status-name">{skill.name}</span>
                  {skill.description ? (
                    <span className="altai-mcp-status-state">{skill.description}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
