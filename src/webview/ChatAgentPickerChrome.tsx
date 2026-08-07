/**
 * Desktop-style agent switcher for the chat composer config row.
 */

import {
  AgentOptionRow,
  AgentSwitcherTrigger,
} from "@altai/agent-ui";
import {
  AbsoluteIcon,
  CodeIcon,
  PaintBrush04Icon,
  PencilEdit02Icon,
  ShieldUserIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import {
  COMPOSER_AGENT_PROFILES,
  canMountAgentPicker,
  resolveComposerAgent,
  type ComposerAgentIconId,
  type ComposerAgentProfile,
} from "./agentPickerChrome.js";

const ICON_BY_ID: Record<ComposerAgentIconId, IconSvgElement> = {
  coder: CodeIcon,
  architect: AbsoluteIcon,
  reviewer: PencilEdit02Icon,
  security: ShieldUserIcon,
  designer: PaintBrush04Icon,
  spark: SparklesIcon,
};

function iconFor(icon: ComposerAgentIconId): IconSvgElement {
  return ICON_BY_ID[icon] ?? CodeIcon;
}

export type ChatAgentPickerChromeProps = {
  /** Current profile id (controlled). */
  agentId: string;
  onAgentChange: (agent: ComposerAgentProfile) => void;
  /** When false, render nothing (mirrors Settings → agent picker toggle). */
  enabled?: boolean;
  disabled?: boolean;
};

export function ChatAgentPickerChrome({
  agentId,
  onAgentChange,
  enabled = true,
  disabled = false,
}: ChatAgentPickerChromeProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const active = resolveComposerAgent(agentId);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (event: PointerEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!canMountAgentPicker({ agentPickerEnabled: enabled })) {
    return null;
  }

  return (
    <div
      className="altai-agent-picker"
      ref={rootRef}
      data-open={open ? "1" : "0"}
    >
      <AgentSwitcherTrigger
        name={active.name}
        icon={iconFor(active.icon)}
        variant="toolbar"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) {
            return;
          }
          setOpen((value) => !value);
        }}
      />
      {open ? (
        <div
          className="altai-agent-popover"
          role="listbox"
          aria-label="Agent profiles"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="altai-agent-popover-heading">Agents</div>
          {COMPOSER_AGENT_PROFILES.map((agent) => {
            const selected = agent.id === active.id;
            return (
              <button
                key={agent.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={
                  selected
                    ? "altai-agent-option is-selected"
                    : "altai-agent-option"
                }
                onClick={() => {
                  onAgentChange(agent);
                  setOpen(false);
                }}
              >
                <AgentOptionRow
                  name={agent.name}
                  description={agent.description}
                  icon={iconFor(agent.icon)}
                  selected={selected}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
