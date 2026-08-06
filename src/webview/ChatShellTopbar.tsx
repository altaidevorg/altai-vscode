/**
 * Shared WorkspaceTopbarActions: Work / Inbox / optional run-inspector.
 */

import {
  WorkspaceTopbarActions,
  useCapability,
} from "@altai/agent-ui";
import {
  canMountWorkspaceTopbar,
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
  const canTaskRuns = useCapability("work.taskRuns");
  const canAutomations = useCapability("work.automations");
  const canInbox = useCapability("inbox.notifications");
  const canShow = canMountWorkspaceTopbar({
    taskRuns: canTaskRuns,
    automations: canAutomations,
    inbox: canInbox,
    inspector: inspectorAvailable,
  });

  if (!canShow) {
    return null;
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
