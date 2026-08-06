/**
 * Shared WorkspaceTopbarActions: Work / Inbox shortcuts into Operations.
 * Inspector stays hidden until a review surface is backed by host ports.
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
  surface: "chat" | "operations";
  operationsView: string;
  attentionCount: number;
  onOpenWork: () => void;
  onOpenInbox: () => void;
};

export function ChatShellTopbar({
  surface,
  operationsView,
  attentionCount,
  onOpenWork,
  onOpenInbox,
}: ChatShellTopbarProps) {
  const canTaskRuns = useCapability("work.taskRuns");
  const canAutomations = useCapability("work.automations");
  const canInbox = useCapability("inbox.notifications");
  const canShow = canMountWorkspaceTopbar({
    taskRuns: canTaskRuns,
    automations: canAutomations,
    inbox: canInbox,
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
      inspectorOpen={false}
      inspectorAvailable={false}
      onToggleWork={() => {
        onOpenWork();
      }}
      onToggleInbox={() => {
        onOpenInbox();
      }}
      onToggleInspector={() => {
        /* Inspector deferred — not advertised. */
      }}
    />
  );
}
