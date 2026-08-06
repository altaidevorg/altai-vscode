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

/** True when at least one provider reports connected credentials. */
export function hasConnectedProvider(
  providers: readonly ProviderStatus[],
): boolean {
  return providers.some((provider) => provider.connected);
}

/**
 * Compact connect banner belongs above the composer when status is ready and
 * no usable provider connection is available yet.
 */
export function shouldShowProviderConnectBanner(input: {
  providerStatus: boolean;
  ready: boolean;
  providers: readonly ProviderStatus[];
}): boolean {
  return (
    input.providerStatus &&
    input.ready &&
    !hasConnectedProvider(input.providers)
  );
}

/**
 * Prefer a disconnected (or errored) provider for Connect. Returns null when
 * the host reported no providers at all.
 */
export function firstConnectableProvider(
  providers: readonly ProviderStatus[],
): ProviderStatus | null {
  if (providers.length === 0) {
    return null;
  }
  const sorted = sortProvidersForDisplay(providers);
  return sorted.find((provider) => !provider.connected) ?? sorted[0] ?? null;
}
