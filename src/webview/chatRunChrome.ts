/**
 * Pure helpers for Chat review / recovery banners (ChangeReviewBanner,
 * RunBlockedBanner parity with Desktop chrome — host supplies counts).
 */

import type { ChatDisplayMessage } from "./chatDisplayMessage.js";

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

export function shouldShowChangeReviewBanner(queueLen: number): boolean {
  return queueLen > 0;
}

/**
 * Extract a user-facing blocked-run message from lifecycle terminal payloads.
 * Returns null for clean successes and unrelated events.
 */
export function runBlockedMessageFromEvent(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  const body = unwrap(payload);
  const crateType =
    (typeof body.type === "string" && body.type) ||
    (isRecord(body.event) &&
      typeof body.event.type === "string" &&
      body.event.type) ||
    "";

  if (
    crateType !== "run_terminated" &&
    crateType !== "run_cancelled" &&
    body.outcome === undefined &&
    body.error === undefined
  ) {
    return null;
  }

  const outcome =
    (typeof body.outcome === "string" && body.outcome) ||
    (isRecord(body.event) &&
      typeof body.event.outcome === "string" &&
      body.event.outcome) ||
    "";

  if (crateType === "run_cancelled" || outcome === "cancelled") {
    return "Run cancelled";
  }

  const errorText =
    (typeof body.error === "string" && body.error) ||
    (isRecord(body.error) &&
      typeof body.error.message === "string" &&
      body.error.message) ||
    (isRecord(body.event) &&
      typeof body.event.error === "string" &&
      body.event.error) ||
    (typeof body.message === "string" && body.message) ||
    "";

  if (
    outcome === "error" ||
    outcome === "failed" ||
    outcome === "failure" ||
    errorText
  ) {
    return errorText.trim() || "Run failed";
  }

  return null;
}

function unwrap(payload: Record<string, unknown>): Record<string, unknown> {
  if (typeof payload.type === "string") {
    return payload;
  }
  if (isRecord(payload.payload) && typeof payload.payload.type === "string") {
    return payload.payload;
  }
  return payload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
