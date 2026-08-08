/**
 * Pure helpers for Chat review / recovery banners (ChangeReviewBanner,
 * RunBlockedBanner parity with Desktop chrome — host supplies counts).
 *
 * Event message + recovery policy lives in `@altai/agent-ui` (Wave 4 / A6.14).
 * Edit-diff list helpers live in `@altai/agent-ui` (A6.67).
 */

export {
  countPendingEditDiffs,
  isEditDiffMessage,
  lastEditDiffMessage,
  lastEditDiffMessageIndex,
  recoveryCopy,
  runBlockedMessageFromEvent,
  runWarningMessageFromEvent,
  shouldShowChangeReviewBanner,
  shouldShowRunRecovery,
  type EditDiffMessageLike,
  type RecoveryChromeFlags,
} from "@altai/agent-ui";
