/**
 * Capability-adjacent Chat chrome: change-review and run-blocked banners.
 */

import {
  ChangeReviewBanner,
  RunBlockedBanner,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useState } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import {
  countPendingEditDiffs,
  lastEditDiffMessage,
  shouldShowChangeReviewBanner,
} from "./chatRunChrome.js";

export type ChatRunStatusChromeProps = {
  messages: readonly ChatDisplayMessage[];
  runBlockedMessage: string | null;
  onDismissBlocked?: () => void;
  onOpenFileError?: (message: string) => void;
};

export function ChatRunStatusChrome({
  messages,
  runBlockedMessage,
  onDismissBlocked,
  onOpenFileError,
}: ChatRunStatusChromeProps) {
  const ports = useHostPorts();
  const canOpenDiff = useCapability("workspace.openDiff");
  const [opening, setOpening] = useState(false);
  const queueLen = countPendingEditDiffs(messages);
  const showReview = shouldShowChangeReviewBanner(queueLen);

  if (!showReview && !runBlockedMessage) {
    return null;
  }

  return (
    <div className="altai-run-status-chrome" aria-label="Run status">
      {runBlockedMessage ? (
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
