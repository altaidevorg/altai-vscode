/**
 * Pure helpers for Extension Host → Webview Settings surface deep-links.
 */

import type { OpenSettingsPayload } from "./messages.js";

export function parseOpenSettingsPayload(
  value: unknown,
): OpenSettingsPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.key !== "number" || !Number.isFinite(record.key)) {
    return null;
  }
  return { key: record.key };
}

export function buildOpenSettingsPayload(input?: {
  key?: number;
}): OpenSettingsPayload {
  return { key: input?.key ?? Date.now() };
}
