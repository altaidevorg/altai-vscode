/**
 * Shared WorkspaceTopbarActions: Work / Inbox / optional run-inspector.
 */

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  WorkspaceTopbarActions,
  useCapability,
} from "@altai/agent-ui";
import {
  resolveWorkOsTopbarMode,
  workspaceTopbarInboxOpen,
  workspaceTopbarWorkOpen,
} from "./chatWorkspaceTopbar.js";

export type ChatShellTopbarProps = {
  surface: "chat" | "operations" | "settings";
  operationsView: string;
  attentionCount: number;
  inspectorAvailable?: boolean;
  inspectorOpen?: boolean;
  onOpenWork: () => void;
  onOpenInbox: () => void;
  onToggleInspector?: () => void;
};

export function ChatShellTopbar({
  surface,
  operationsView,
  attentionCount,
  inspectorAvailable = false,
  inspectorOpen = false,
  onOpenWork,
  onOpenInbox,
  onToggleInspector,
}: ChatShellTopbarProps) {
  const canWork = useCapability("work.items");
  const canInbox = useCapability("work.inbox");
  const mode = resolveWorkOsTopbarMode({
    work: canWork,
    inbox: canInbox,
    inspector: inspectorAvailable,
  });

  if (mode === "hidden") {
    return null;
  }

  if (mode === "inspector") {
    const label = inspectorOpen ? "Close run details" : "Open run details";
    return (
      <div className="altai-ai-topbar-actions flex shrink-0 items-center gap-0.5 rounded-lg border border-border/60 bg-muted/35 p-0.5">
        <button
          type="button"
          onClick={() => onToggleInspector?.()}
          aria-label={label}
          aria-pressed={inspectorOpen}
          title={label}
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground${
            inspectorOpen ? " bg-foreground/[0.09] text-foreground" : ""
          }`}
        >
          <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  const workOpen = workspaceTopbarWorkOpen(surface, operationsView);
  const inboxOpen = workspaceTopbarInboxOpen(surface, operationsView);

  return (
    <WorkspaceTopbarActions
      variant="sidebar"
      workOpen={workOpen}
      inboxOpen={inboxOpen}
      inboxAttentionCount={attentionCount}
      inspectorOpen={inspectorOpen}
      inspectorAvailable={inspectorAvailable}
      onToggleWork={() => {
        onOpenWork();
      }}
      onToggleInbox={() => {
        onOpenInbox();
      }}
      onToggleInspector={() => {
        onToggleInspector?.();
      }}
    />
  );
}
