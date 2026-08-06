/**
 * Pure helpers for Chat review / recovery banners (ChangeReviewBanner,
 * RunBlockedBanner parity with Desktop chrome — host supplies counts).
 *
 * Event message + recovery policy lives in `@altai/agent-ui` (Wave 4 / A6.14).
 * Diff-list helpers stay host-local (they depend on ChatDisplayMessage shape).
 */

import type { ChatDisplayMessage } from "./chatDisplayMessage.js";

export {
  recoveryCopy,
  runBlockedMessageFromEvent,
  runWarningMessageFromEvent,
  shouldShowChangeReviewBanner,
  shouldShowRunRecovery,
  type RecoveryChromeFlags,
} from "@altai/agent-ui";

/** Count tool rows that carry before/after text for review. */
export function countPendingEditDiffs(
  messages: readonly ChatDisplayMessage[],
): number {
  return messages.filter(
    (message) =>
      message.role === "tool" &&
      message.diffOriginalText !== undefined &&
      message.diffModifiedText !== undefined,
  ).length;
}

/** Most recent edit_diff bubble (for Review changes → scroll/open). */
export function lastEditDiffMessage(
  messages: readonly ChatDisplayMessage[],
): ChatDisplayMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (
      message &&
      message.role === "tool" &&
      message.diffOriginalText !== undefined &&
      message.diffModifiedText !== undefined
    ) {
      return message;
    }
  }
  return null;
}
