/**
 * Capability-adjacent Chat chrome: change-review, blocked, and recovery strips.
 */

import {
  ChangeReviewBanner,
  RunBlockedBanner,
  RunRecoveryActions,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useState } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import {
  countPendingEditDiffs,
  lastEditDiffMessage,
  recoveryCopy,
  shouldShowChangeReviewBanner,
  shouldShowRunRecovery,
} from "./chatRunChrome.js";

export type ChatRunStatusChromeProps = {
  messages: readonly ChatDisplayMessage[];
  runBlockedMessage: string | null;
  runWarningMessage?: string | null;
  canRetry?: boolean;
  canSteer?: boolean;
  hasActiveRun?: boolean;
  onDismissBlocked?: () => void;
  onDismissWarning?: () => void;
  onRetry?: () => void;
  onSteer?: () => void;
  onStop?: () => void;
  onOpenFileError?: (message: string) => void;
  /** Open the multi-diff change review panel. */
  onOpenChangeReview?: () => void;
};

export function ChatRunStatusChrome({
  messages,
  runBlockedMessage,
  runWarningMessage = null,
  canRetry = false,
  canSteer = false,
  hasActiveRun = false,
  onDismissBlocked,
  onDismissWarning,
  onRetry,
  onSteer,
  onStop,
  onOpenFileError,
  onOpenChangeReview,
}: ChatRunStatusChromeProps) {
  const ports = useHostPorts();
  const canOpenDiff = useCapability("workspace.openDiff");
  const [opening, setOpening] = useState(false);
  const queueLen = countPendingEditDiffs(messages);
  const showReview = shouldShowChangeReviewBanner(queueLen);
  const recoveryFlags = {
    blockedMessage: runBlockedMessage,
    warningMessage: runWarningMessage,
    canRetry,
    canSteer,
    hasActiveRun,
  };
  const showRecovery = shouldShowRunRecovery(recoveryFlags);
  const showStaticBlocked =
    Boolean(runBlockedMessage) && !showRecovery;
  const copy = recoveryCopy(recoveryFlags);

  if (!showReview && !showRecovery && !showStaticBlocked) {
    return null;
  }

  return (
    <div className="altai-run-status-chrome" aria-label="Run status">
      {showRecovery ? (
        <RunRecoveryActions
          warning={copy.warning}
          title={copy.title}
          detail={copy.detail}
          canContinue={false}
          canRetry={canRetry && Boolean(onRetry)}
          onContinue={() => {}}
          onRetry={() => {
            onRetry?.();
          }}
          onSteer={() => {
            onSteer?.();
          }}
          onStop={() => {
            onStop?.();
          }}
          onDismiss={() => {
            if (copy.warning) {
              onDismissWarning?.();
            } else {
              onDismissBlocked?.();
            }
          }}
        />
      ) : null}
      {showStaticBlocked && runBlockedMessage ? (
        <div className="altai-run-blocked-wrap">
          <RunBlockedBanner message={runBlockedMessage} />
          {onDismissBlocked ? (
            <button
              type="button"
              className="altai-run-blocked-dismiss"
              onClick={onDismissBlocked}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}
      {showReview ? (
        <ChangeReviewBanner
          queueLen={queueLen}
          onOpen={() => {
            if (onOpenChangeReview) {
              onOpenChangeReview();
              return;
            }
            const target = lastEditDiffMessage(messages);
            if (!target) {
              return;
            }
            const el = document.getElementById(`altai-msg-${target.id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "nearest" });

            if (
              !canOpenDiff ||
              opening ||
              target.diffOriginalText === undefined ||
              target.diffModifiedText === undefined
            ) {
              return;
            }
            setOpening(true);
            void ports.workspace
              .openDiff({
                title: target.filePath
                  ? `ALTAI · ${target.filePath}`
                  : "ALTAI review",
                originalText: target.diffOriginalText,
                modifiedText: target.diffModifiedText,
                ...(target.filePath ? { path: target.filePath } : {}),
              })
              .catch((err: unknown) => {
                onOpenFileError?.(
                  err instanceof Error ? err.message : String(err),
                );
              })
              .finally(() => {
                setOpening(false);
              });
          }}
        />
      ) : null}
    </div>
  );
}
