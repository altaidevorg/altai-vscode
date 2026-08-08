/**
 * Pure helpers for VS Code composer submit via ports-first executeComposerSubmit
 * (A6.37). Host still owns startRun/steer I/O and slash host actions.
 */

import {
  getComposerActionAvailability,
  type ComposerAction,
  type ComposerActionAvailability,
  type ComposerFileAttachment,
  type ComposerFollowupMode,
} from "@altai/agent-ui";
import type { ComposerContextItem } from "./composerContext.js";
import { basenamePath } from "./composerContext.js";

/** Map follow-up submit mode to shared composer action. */
export function followupModeToComposerAction(
  mode: ComposerFollowupMode,
): ComposerAction {
  if (mode === "steer") return "steer";
  if (mode === "queue") return "queue";
  return "send";
}

/**
 * Availability gates for executeComposerSubmit that match VS Code follow-up
 * mode (capabilities already applied by resolveComposerSubmitMode).
 */
export function composerAvailabilityForFollowupMode(
  mode: ComposerFollowupMode,
  input: {
    hasDraft: boolean;
    runId: string | null;
    submitting?: boolean;
  },
): ComposerActionAvailability {
  return getComposerActionAvailability({
    status: mode === "start" ? "idle" : "streaming",
    hasDraft: input.hasDraft,
    hasNativeAttachment: false,
    runId: mode === "start" ? null : input.runId,
    submitting: input.submitting ?? false,
  });
}

/**
 * Map non-file context chips into package draft attachments so shared compose
 * and hasDraft treat them like Desktop file chips. File URI chips stay host
 * RunAttachment only (do not emit empty `<file>` blocks).
 */
export function contextItemsToComposerDraftFiles(
  items: readonly ComposerContextItem[],
): ComposerFileAttachment[] {
  const out: ComposerFileAttachment[] = [];
  for (const item of items) {
    if (item.kind === "file") {
      continue;
    }
    if (item.kind === "selection") {
      out.push({
        id: item.id,
        name: basenamePath(item.path),
        kind: "selection",
        mediaType: "text/plain",
        text: item.text,
        size: item.text.length,
        source: "editor",
      });
      continue;
    }
    if (item.kind === "diff") {
      out.push({
        id: item.id,
        name: item.name,
        kind: "diff",
        mediaType: "text/plain",
        text: item.text,
        size: item.text.length,
      });
      continue;
    }
    out.push({
      id: item.id,
      name: item.name,
      kind: "terminal",
      mediaType: "text/plain",
      text: item.text,
      size: item.text.length,
    });
  }
  return out;
}

/**
 * Draft value for package plan when the user has attachments/snippets but no
 * typed body (matches VS Code fall-back used by startRun).
 */
export function draftValueForComposerSubmit(input: {
  text: string;
  contextItems: readonly ComposerContextItem[];
  snippetCount: number;
}): string {
  const trimmed = input.text.trim();
  if (trimmed) return input.text;
  if (input.contextItems.length > 0 || input.snippetCount > 0) {
    return "Please review the attached context.";
  }
  return "";
}
