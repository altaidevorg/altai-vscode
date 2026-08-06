/**
 * Compact Run details strip: shared RunDetailsHeader + RunOverviewCard when a
 * run is active or blocked (no deferred Apply controls).
 */

import {
  AgentStatusPill,
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
import {
  buildRunOverviewMetrics,
  canShowRunDetailsChrome,
  countToolMessages,
  runDetailsStatus,
  runDetailsStepLabel,
  runDetailsSubtitle,
  runDetailsTokenLabel,
} from "./runDetailsChrome.js";

export type ChatRunDetailsChromeProps = {
  messages: readonly ChatDisplayMessage[];
  chatId: string | null;
  hasActiveRun: boolean;
  busy: boolean;
  approvalsPending: number;
  blockedMessage: string | null;
  warningMessage?: string | null;
  onStop?: () => void;
  onClose?: () => void;
};

export function ChatRunDetailsChrome({
  messages,
  chatId,
  hasActiveRun,
  busy,
  approvalsPending,
  blockedMessage,
  warningMessage = null,
  onStop,
  onClose,
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

  return (
    <section className="altai-run-details-chrome" aria-label="Run details">
      <RunDetailsHeader
        subtitle={runDetailsSubtitle({ chatId, status })}
        status={status}
        onClose={onClose}
        onStop={hasActiveRun && onStop ? onStop : undefined}
      />
      <div className="px-2.5 pb-2">
        <RunOverviewCard
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
          tokenLabel={runDetailsTokenLabel({ hasActiveRun, status })}
          step={step}
          metrics={metrics}
        />
      </div>
    </section>
  );
}
