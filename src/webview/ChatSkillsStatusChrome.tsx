/**
 * Capability-gated installed-skills list in Chat footer (read-only).
 */

import {
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

export function ChatSkillsStatusChrome() {
  const ports = useHostPorts();
  const canList = useCapability("skills.list");
  const canShow = canMountSkillsStatus({ skillsList: canList });
  const [skills, setSkills] = useState<SkillView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <section className="altai-skills-status" aria-label="Skills">
      <div className="altai-mcp-status-header">
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
      {open ? (
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
      ) : null}
    </section>
  );
}
