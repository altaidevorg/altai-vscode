/**
 * Compact Details chrome: shared RunDetailsHeader + RunOverviewCard when a
 * run is active or blocked, plus optional inspector sections.
 */

import {
  AgentStatusPill,
  AiRunInspectorFrame,
  RunDetailsHeader,
  RunOverviewCard,
} from "@altai/agent-ui";
import { useMemo } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import {
  deriveAgentStatusMeta,
  formatAgentStepLabel,
  isRecoverableRunAttention,
} from "./agentStatusPillChrome.js";
import { countPendingEditDiffs } from "./chatRunChrome.js";
import { ChatRunInspectorSections } from "./ChatRunInspectorSections.js";
import type { PendingToolApproval } from "./interactivePrompt.js";
import {
  buildRunOverviewMetrics,
  canShowRunDetailsChrome,
  countToolMessages,
  runDetailsStatus,
  runDetailsStepLabel,
  runDetailsSubtitle,
  runDetailsTokenLabel,
} from "./runDetailsChrome.js";
import type { RunUsageTotals } from "./usageMeterChrome.js";

export type ChatRunDetailsChromeProps = {
  messages: readonly ChatDisplayMessage[];
  chatId: string | null;
  hasActiveRun: boolean;
  busy: boolean;
  approvalsPending: number;
  approvals?: readonly PendingToolApproval[];
  onApprovalsChange?: (next: PendingToolApproval[]) => void;
  blockedMessage: string | null;
  warningMessage?: string | null;
  /** Accumulated prompt+completion tokens from host usage events. */
  totalTokens?: number | null;
  inputTokens?: number;
  outputTokens?: number;
  onStop?: () => void;
  onClose?: () => void;
  onOpenChangeReview?: () => void;
  runUsage?: RunUsageTotals | null;
};

export function ChatRunDetailsChrome({
  messages,
  chatId,
  hasActiveRun,
  busy,
  approvalsPending,
  approvals = [],
  onApprovalsChange,
  blockedMessage,
  warningMessage = null,
  totalTokens = null,
  inputTokens = 0,
  outputTokens = 0,
  onStop,
  onClose,
  onOpenChangeReview,
  runUsage = null,
}: ChatRunDetailsChromeProps) {
  const show = canShowRunDetailsChrome({
    hasActiveRun,
    blockedMessage,
    warningMessage,
  });

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

  const status = runDetailsStatus({ hasActiveRun, blockedMessage });
  const metrics = useMemo(
    () =>
      buildRunOverviewMetrics({
        messages,
        toolCount: countToolMessages(messages),
        editDiffCount: countPendingEditDiffs(messages),
        approvalsPending,
      }),
    [messages, approvalsPending],
  );

  if (!show) {
    return null;
  }

  const step = runDetailsStepLabel({
    step: meta.step ? formatAgentStepLabel(meta.step) : null,
    blockedMessage,
    warningMessage,
  });

  const tokenTotal =
    totalTokens ??
    (runUsage && runUsage.totalTokens > 0 ? runUsage.totalTokens : null);
  const inTok = inputTokens || runUsage?.inputTokens || 0;
  const outTok = outputTokens || runUsage?.outputTokens || 0;

  return (
    <AiRunInspectorFrame
      variant="compact"
      className="altai-run-details-chrome"
      header={<RunDetailsHeader
        subtitle={runDetailsSubtitle({ chatId, status })}
        status={status}
        onClose={onClose}
        onStop={hasActiveRun && onStop ? onStop : undefined}
      />}
      summary={<RunOverviewCard
          statusPill={
            <AgentStatusPill
              meta={meta}
              formatStepLabel={formatAgentStepLabel}
              isRecoverableAttention={isRecoverableRunAttention}
              busy={busy && !hasActiveRun && approvalsPending === 0}
              hideError={Boolean(blockedMessage || warningMessage)}
              announce={false}
            />
          }
          tokenLabel={runDetailsTokenLabel({
            hasActiveRun,
            status,
            totalTokens: tokenTotal,
          })}
          step={step}
          metrics={metrics}
        />}
    >
      {onApprovalsChange ? (
        <ChatRunInspectorSections
          messages={messages}
          approvals={approvals}
          onApprovalsChange={onApprovalsChange}
          onOpenChangeReview={onOpenChangeReview}
          inputTokens={inTok}
          outputTokens={outTok}
        />
      ) : null}
    </AiRunInspectorFrame>
  );
}
