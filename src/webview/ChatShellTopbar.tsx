/**
 * Details control for the active chat (Work / Inbox live under Operations).
 */

import { WorkspaceTopbarActions } from "@altai/agent-ui";

export type ChatShellTopbarProps = {
  inspectorAvailable?: boolean;
  inspectorOpen?: boolean;
  onToggleInspector?: () => void;
};

export function ChatShellTopbar({
  inspectorAvailable = false,
  inspectorOpen = false,
  onToggleInspector,
}: ChatShellTopbarProps) {
  if (!inspectorAvailable || !onToggleInspector) {
    return null;
  }

  return (
    <WorkspaceTopbarActions
      inspectorOpen={inspectorOpen}
      inspectorAvailable={inspectorAvailable}
      onToggleInspector={onToggleInspector}
    />
  );
}
