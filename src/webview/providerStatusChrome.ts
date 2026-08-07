/**
 * Pure helpers for capability-gating provider status chrome.
 */

import type { ProviderStatus } from "@altai/host-contract";
import {
  KNOWN_PROVIDERS,
  knownProviderById,
} from "../shared/providerCatalog.js";

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
 * Merge host provider status with the known catalog so every BYOK target is
 * visible even when the host returns a partial list.
 */
export function mergeProviderCatalog(
  host: readonly ProviderStatus[],
): ProviderStatus[] {
  const byId = new Map<string, ProviderStatus>();
  for (const entry of KNOWN_PROVIDERS) {
    byId.set(entry.id, {
      providerId: entry.id,
      label: entry.label,
      connected: Boolean(entry.keyless),
    });
  }
  for (const status of host) {
    const id = status.providerId.trim();
    if (!id) {
      continue;
    }
    const known = knownProviderById(id);
    const prev = byId.get(id);
    byId.set(id, {
      providerId: id,
      connected: status.connected,
      label: status.label?.trim() || known?.label || prev?.label || id,
      ...(status.error ? { error: status.error } : {}),
    });
  }
  return sortProvidersForDisplay([...byId.values()]);
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
  if (label && label.length > 0) {
    return label;
  }
  return knownProviderById(provider.providerId)?.label ?? provider.providerId;
}

/** Short status copy for list rows. */
export function providerStatusCopy(provider: ProviderStatus): string {
  if (provider.error) {
    return provider.error;
  }
  if (knownProviderById(provider.providerId)?.keyless) {
    return provider.connected ? "Local (no key)" : "Not ready";
  }
  return provider.connected ? "API key saved" : "Not connected";
}

export function providerConsoleUrl(providerId: string): string | undefined {
  return knownProviderById(providerId)?.consoleUrl;
}

export function providerRequiresBaseUrl(providerId: string): boolean {
  return Boolean(knownProviderById(providerId)?.requiresBaseUrl);
}

export function isKeylessProvider(provider: {
  providerId?: string;
  keyless?: boolean;
}): boolean {
  if (provider.keyless) {
    return true;
  }
  if (provider.providerId) {
    return Boolean(knownProviderById(provider.providerId)?.keyless);
  }
  return false;
}

/** True when at least one non-keyless provider reports connected credentials. */
export function hasConnectedProvider(
  providers: readonly ProviderStatus[],
): boolean {
  return providers.some(
    (provider) =>
      provider.connected && !knownProviderById(provider.providerId)?.keyless,
  );
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
 * Prefer a disconnected cloud provider for Connect.
 */
export function firstConnectableProvider(
  providers: readonly ProviderStatus[],
): ProviderStatus | null {
  if (providers.length === 0) {
    return null;
  }
  const sorted = sortProvidersForDisplay(providers);
  return (
    sorted.find(
      (provider) =>
        !provider.connected && !knownProviderById(provider.providerId)?.keyless,
    ) ??
    sorted.find((provider) => !provider.connected) ??
    sorted[0] ??
    null
  );
}
