/**
 * Compact live agent status chip for Chat (shared AgentStatusPill).
 */

import { AgentStatusPill } from "@altai/agent-ui";
import { useMemo } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import {
  deriveAgentStatusMeta,
  formatAgentStepLabel,
  isRecoverableRunAttention,
} from "./agentStatusPillChrome.js";

export type ChatAgentStatusPillProps = {
  messages: readonly ChatDisplayMessage[];
  hasActiveRun: boolean;
  busy: boolean;
  approvalsPending: number;
  blockedMessage: string | null;
  warningMessage?: string | null;
  onOpenLog?: () => void;
};

export function ChatAgentStatusPill({
  messages,
  hasActiveRun,
  busy,
  approvalsPending,
  blockedMessage,
  warningMessage = null,
  onOpenLog,
}: ChatAgentStatusPillProps) {
  const meta = useMemo(
    () =>
      deriveAgentStatusMeta({
        hasActiveRun,
        busy,
        approvalsPending,
        blockedMessage,
        warningMessage,
        messages,
      }),
    [
      hasActiveRun,
      busy,
      approvalsPending,
      blockedMessage,
      warningMessage,
      messages,
    ],
  );

  return (
    <div className="altai-agent-status-slot px-2.5 pb-1">
      <AgentStatusPill
        meta={meta}
        formatStepLabel={formatAgentStepLabel}
        isRecoverableAttention={isRecoverableRunAttention}
        busy={busy && !hasActiveRun && approvalsPending === 0}
        hideError={Boolean(blockedMessage || warningMessage)}
        onClick={onOpenLog}
        announce
      />
    </div>
  );
}
