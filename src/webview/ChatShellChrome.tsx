/**
 * Desktop-like two-row AI topbar for the VS Code side panel
 * (history-adjacent actions: Work / Inbox / inspector + Settings gear).
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
import { ChatShellTopbar } from "./ChatShellTopbar.js";

export type ChatShellChromeProps = {
  surface: ShellSurface;
  operationsView: string;
  attentionCount: number;
  hostStatus: string;
  hostMessage?: string;
  inspectorAvailable?: boolean;
  inspectorOpen?: boolean;
  onSelectSurface: (surface: ShellSurface) => void;
  onOpenWork: () => void;
  onOpenInbox: () => void;
  onToggleInspector?: () => void;
};

export function ChatShellChrome({
  surface,
  operationsView,
  attentionCount,
  hostStatus,
  hostMessage,
  inspectorAvailable = false,
  inspectorOpen = false,
  onSelectSurface,
  onOpenWork,
  onOpenInbox,
  onToggleInspector,
}: ChatShellChromeProps) {
  const statusChip = compactHostStatusLabel(hostStatus, hostMessage);
  const settingsPressed = settingsGearPressed(surface);

  return (
    <AiPanelTopbar
      aria-label="ALTAI panel chrome"
      className="altai-shell-topbar"
      primary={<div className="altai-ai-topbar-row altai-ai-topbar-row--primary">
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
      </div>}
      secondary={<div className="altai-ai-topbar-row altai-ai-topbar-row--actions">
        <ChatShellTopbar
          surface={surface}
          operationsView={operationsView}
          attentionCount={attentionCount}
          inspectorAvailable={inspectorAvailable}
          inspectorOpen={inspectorOpen}
          onOpenWork={onOpenWork}
          onOpenInbox={onOpenInbox}
          onToggleInspector={onToggleInspector}
        />
        <div className="altai-ai-topbar-spacer" />
        {surface !== "chat" ? (
          <button
            type="button"
            className="altai-ai-text-btn"
            onClick={() => {
              onSelectSurface("chat");
            }}
          >
            Back to chat
          </button>
        ) : null}
      </div>}
    />
  );
}
