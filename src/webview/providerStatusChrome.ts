/**
 * Pure helpers for capability-gating provider status chrome.
 */

import type { ProviderStatus } from "@altai/host-contract";

export type ProviderStatusFlags = {
  providerStatus: boolean;
};

/**
 * Show provider status chrome only when the full status/connect/clear capability
 * is advertised (no dead Connect buttons).
 */
export function canMountProviderStatus(flags: ProviderStatusFlags): boolean {
  return flags.providerStatus;
}

/**
 * Sort providers: disconnected and errored first so attention is visible.
 */
export function sortProvidersForDisplay(
  providers: readonly ProviderStatus[],
): ProviderStatus[] {
  return [...providers].sort((a, b) => {
    const score = (item: ProviderStatus): number => {
      if (item.error) {
        return 0;
      }
      if (!item.connected) {
        return 1;
      }
      return 2;
    };
    const delta = score(a) - score(b);
    if (delta !== 0) {
      return delta;
    }
    return displayProviderLabel(a).localeCompare(displayProviderLabel(b));
  });
}

export function displayProviderLabel(provider: ProviderStatus): string {
  const label = provider.label?.trim();
  return label && label.length > 0 ? label : provider.providerId;
}

/** Short status copy for list rows. */
export function providerStatusCopy(provider: ProviderStatus): string {
  if (provider.error) {
    return provider.error;
  }
  return provider.connected ? "Connected" : "Not connected";
}
