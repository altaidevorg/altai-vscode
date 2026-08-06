/**
 * Capability-gated render of pending tool approvals and clarifications.
 */

import {
  AiToolApproval,
  ClarificationChoices,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useCallback, useState } from "react";
import type {
  PendingClarificationPrompt,
  PendingToolApproval,
} from "./interactivePrompt.js";

export type ChatInteractivePromptsProps = {
  approvals: PendingToolApproval[];
  clarification: PendingClarificationPrompt | null;
  onApprovalsChange: (next: PendingToolApproval[]) => void;
  onClarificationChange: (next: PendingClarificationPrompt | null) => void;
};

export function ChatInteractivePrompts({
  approvals,
  clarification,
  onApprovalsChange,
  onClarificationChange,
}: ChatInteractivePromptsProps) {
  const ports = useHostPorts();
  const canApproval = useCapability("interactive.approval");
  const canClarification = useCapability("interactive.clarification");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respondApproval = useCallback(
    async (item: PendingToolApproval, approved: boolean) => {
      if (!canApproval) {
        return;
      }
      setBusyId(item.approvalId);
      setError(null);
      try {
        await ports.runtime.respondToApproval({
          chatId: item.chatId,
          runId: item.runId,
          approvalId: item.approvalId,
          decision: approved ? "approve" : "deny",
        });
        onApprovalsChange(
          approvals.filter((row) => row.approvalId !== item.approvalId),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    },
    [ports, canApproval, approvals, onApprovalsChange],
  );

  const respondClarification = useCallback(
    async (item: PendingClarificationPrompt, text: string) => {
      if (!canClarification) {
        return;
      }
      setBusyId(item.ticketId ?? "clarification");
      setError(null);
      try {
        await ports.runtime.respondToClarification({
          chatId: item.chatId,
          ticketId: item.ticketId ?? "pending",
          action: "reply",
          text,
        });
        onClarificationChange(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    },
    [ports, canClarification, onClarificationChange],
  );

  const visibleApprovals = canApproval ? approvals : [];
  const visibleClarification =
    canClarification && clarification ? clarification : null;

  if (visibleApprovals.length === 0 && !visibleClarification) {
    return error ? (
      <p className="altai-chat-error" role="alert">
        {error}
      </p>
    ) : null;
  }

  return (
    <div className="altai-interactive-prompts" aria-label="Pending decisions">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      {visibleApprovals.map((item) => (
        <div
          key={item.approvalId}
          className={
            busyId === item.approvalId
              ? "altai-interactive-prompt is-busy"
              : "altai-interactive-prompt"
          }
        >
          <AiToolApproval
            toolName={item.toolName}
            part={{
              state: "approval-requested",
              approval: { id: item.approvalId },
              ...(item.input !== undefined ? { input: item.input } : {}),
            }}
            onRespond={(approved) => {
              void respondApproval(item, approved);
            }}
          />
        </div>
      ))}
      {visibleClarification ? (
        <div className="altai-interactive-prompt">
          {visibleClarification.content ? (
            <p className="altai-chat-line">{visibleClarification.content}</p>
          ) : null}
          <ClarificationChoices
            choices={
              visibleClarification.choices.length > 0
                ? visibleClarification.choices
                : null
            }
            editDiff={visibleClarification.editDiff}
            onRespond={(choice) => {
              void respondClarification(visibleClarification, choice);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
