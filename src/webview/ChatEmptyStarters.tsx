/**
 * Empty home quick-fill templates for Chat composer (shared PromptTemplateGrid).
 */

import { PromptTemplateGrid, useCapability } from "@altai/agent-ui";
import {
  DEFAULT_CHAT_STARTERS,
  shouldShowChatStarters,
} from "./chatEmptyStarterTemplates.js";
import { formatComposerHintLine } from "./composerHintChrome.js";

export type ChatEmptyStartersProps = {
  emptyHome: boolean;
  onSelect: (prompt: string) => void;
};

export function ChatEmptyStarters({
  emptyHome,
  onSelect,
}: ChatEmptyStartersProps) {
  const canStartRun = useCapability("runtime.startRun");
  if (
    !shouldShowChatStarters({
      emptyHome,
      canStartRun,
    })
  ) {
    return null;
  }

  return (
    <div className="altai-chat-empty-starters" aria-label="Starter prompts">
      <p className="altai-chat-empty-starters-label">Try a starter</p>
      <PromptTemplateGrid
        templates={[...DEFAULT_CHAT_STARTERS]}
        columns={2}
        density="default"
        onSelect={onSelect}
      />
      <p className="altai-shell-meta" style={{ padding: "0.5rem 0 0" }}>
        Composer · {formatComposerHintLine()}
      </p>
    </div>
  );
}
