/**
 * Pure helpers for capability-gating provider status chrome.
 * Shared rules live in `@altai/agent-ui` (A6.90); known catalog stays host-owned.
 */

import type { ProviderStatus } from "@altai/host-contract";
import {
  canMountProviderStatus as packageCanMountProviderStatus,
  displayProviderLabel as packageDisplayProviderLabel,
  firstConnectableProvider as packageFirstConnectableProvider,
  hasConnectedProvider as packageHasConnectedProvider,
  isKeylessProvider as packageIsKeylessProvider,
  mergeProviderCatalog as packageMergeProviderCatalog,
  providerConsoleUrl as packageProviderConsoleUrl,
  providerRequiresBaseUrl as packageProviderRequiresBaseUrl,
  providerStatusCopy as packageProviderStatusCopy,
  shouldShowProviderConnectBanner as packageShouldShowProviderConnectBanner,
  sortProvidersForDisplay as packageSortProvidersForDisplay,
  type ProviderStatusFlags,
} from "@altai/agent-ui";
import { KNOWN_PROVIDERS } from "../shared/providerCatalog.js";

export type { ProviderStatusFlags, KnownProviderEntry } from "@altai/agent-ui";

export function canMountProviderStatus(flags: ProviderStatusFlags): boolean {
  return packageCanMountProviderStatus(flags);
}

export function mergeProviderCatalog(
  host: readonly ProviderStatus[],
): ProviderStatus[] {
  return packageMergeProviderCatalog(host, KNOWN_PROVIDERS);
}

export function sortProvidersForDisplay(
  providers: readonly ProviderStatus[],
): ProviderStatus[] {
  return packageSortProvidersForDisplay(providers, KNOWN_PROVIDERS);
}

export function displayProviderLabel(provider: ProviderStatus): string {
  return packageDisplayProviderLabel(provider, KNOWN_PROVIDERS);
}

export function providerStatusCopy(provider: ProviderStatus): string {
  return packageProviderStatusCopy(provider, KNOWN_PROVIDERS);
}

export function providerConsoleUrl(providerId: string): string | undefined {
  return packageProviderConsoleUrl(providerId, KNOWN_PROVIDERS);
}

export function providerRequiresBaseUrl(providerId: string): boolean {
  return packageProviderRequiresBaseUrl(providerId, KNOWN_PROVIDERS);
}

export function isKeylessProvider(provider: {
  providerId?: string;
  keyless?: boolean;
}): boolean {
  return packageIsKeylessProvider(provider, KNOWN_PROVIDERS);
}

export function hasConnectedProvider(
  providers: readonly ProviderStatus[],
): boolean {
  return packageHasConnectedProvider(providers, KNOWN_PROVIDERS);
}

export function shouldShowProviderConnectBanner(input: {
  providerStatus: boolean;
  ready: boolean;
  providers: readonly ProviderStatus[];
}): boolean {
  return packageShouldShowProviderConnectBanner({
    ...input,
    knownProviders: KNOWN_PROVIDERS,
  });
}

export function firstConnectableProvider(
  providers: readonly ProviderStatus[],
): ProviderStatus | null {
  return packageFirstConnectableProvider(providers, KNOWN_PROVIDERS);
}
