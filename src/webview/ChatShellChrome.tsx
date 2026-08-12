/**
 * Compact AI shell topbar: brand, host status, Settings.
 * Work / Inbox live under Operations; Details sits on the chat column strip.
 */

import { Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiPanelTopbar } from "@altai/agent-ui";
import {
  compactHostStatusLabel,
  nextSurfaceAfterSettingsToggle,
  settingsGearPressed,
  type ShellSurface,
} from "./shellChrome.js";

export type ChatShellChromeProps = {
  surface: ShellSurface;
  hostStatus: string;
  hostMessage?: string;
  onSelectSurface: (surface: ShellSurface) => void;
};

export function ChatShellChrome({
  surface,
  hostStatus,
  hostMessage,
  onSelectSurface,
}: ChatShellChromeProps) {
  const statusChip = compactHostStatusLabel(hostStatus, hostMessage);
  const settingsPressed = settingsGearPressed(surface);

  return (
    <AiPanelTopbar
      aria-label="ALTAI panel chrome"
      className="altai-shell-topbar"
      primary={
        <div className="altai-ai-topbar-row altai-ai-topbar-row--primary">
          <div className="altai-ai-topbar-brand" aria-hidden="true">
            ALTAI
          </div>
          <div className="altai-ai-topbar-spacer" />
          {statusChip ? (
            <span className="altai-host-pill" data-status={hostStatus}>
              {statusChip}
            </span>
          ) : null}
          <button
            type="button"
            className="altai-ai-icon-btn"
            aria-label="ALTAI settings"
            aria-pressed={settingsPressed}
            title="ALTAI settings"
            onClick={() => {
              onSelectSurface(nextSurfaceAfterSettingsToggle(surface));
            }}
          >
            <HugeiconsIcon icon={Settings01Icon} size={14} strokeWidth={1.75} />
          </button>
        </div>
      }
      secondary={
        surface !== "chat" ? (
          <div className="altai-ai-topbar-row altai-ai-topbar-row--actions">
            <div className="altai-ai-topbar-spacer" />
            <button
              type="button"
              className="altai-ai-text-btn"
              onClick={() => {
                onSelectSurface("chat");
              }}
            >
              Back to chat
            </button>
          </div>
        ) : null
      }
    />
  );
}
