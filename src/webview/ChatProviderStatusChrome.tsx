/**
 * Capability-gated provider status list for Chat.
 * Connect routes through Extension Host password prompt (no secrets in Webview).
 */

import {
  SurfacePrimaryAction,
  SurfaceSecondaryAction,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import type { ProviderStatus } from "@altai/host-contract";
import { useCallback, useEffect, useState } from "react";
import {
  canMountProviderStatus,
  displayProviderLabel,
  providerStatusCopy,
  sortProvidersForDisplay,
} from "./providerStatusChrome.js";

export function ChatProviderStatusChrome() {
  const ports = useHostPorts();
  const canProviders = useCapability("settings.providerStatus");
  const canShow = canMountProviderStatus({ providerStatus: canProviders });
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!canShow) {
      setProviders([]);
      setReady(false);
      return;
    }
    setError(null);
    try {
      const next = await ports.settings.getProviderStatus();
      setProviders(sortProvidersForDisplay(next));
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setReady(false);
    }
  }, [ports, canShow]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canShow) {
    return null;
  }

  return (
    <section className="altai-provider-status" aria-label="Provider status">
      <div className="altai-provider-status-header">
        <h2 className="altai-provider-status-title">Providers</h2>
        <SurfaceSecondaryAction
          type="button"
          onClick={() => {
            void load();
          }}
          disabled={busyId !== null}
        >
          Refresh
        </SurfaceSecondaryAction>
      </div>
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      {!ready && !error ? (
        <p className="altai-shell-meta">Loading providers…</p>
      ) : null}
      {ready && providers.length === 0 ? (
        <p className="altai-shell-meta">No providers reported by the host.</p>
      ) : null}
      <ul className="altai-provider-status-list">
        {providers.map((provider) => {
          const busy = busyId === provider.providerId;
          return (
            <li
              key={provider.providerId}
              className="altai-provider-status-row"
              data-connected={provider.connected ? "true" : "false"}
            >
              <div className="altai-provider-status-meta">
                <span className="altai-provider-status-name">
                  {displayProviderLabel(provider)}
                </span>
                <span
                  className={
                    provider.connected && !provider.error
                      ? "altai-provider-status-state is-on"
                      : "altai-provider-status-state is-off"
                  }
                >
                  {providerStatusCopy(provider)}
                </span>
              </div>
              <div className="altai-provider-status-actions">
                {provider.connected ? (
                  <SurfaceSecondaryAction
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setBusyId(provider.providerId);
                        setError(null);
                        try {
                          await ports.settings.clearProviderCredential(
                            provider.providerId,
                          );
                          await load();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : String(err),
                          );
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                  >
                    {busy ? "…" : "Clear"}
                  </SurfaceSecondaryAction>
                ) : (
                  <SurfacePrimaryAction
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setBusyId(provider.providerId);
                        setError(null);
                        try {
                          // Extension Host prompts for the secret; Webview never sees it.
                          await ports.settings.beginProviderConnection({
                            providerId: provider.providerId,
                          });
                          await load();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : String(err),
                          );
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                  >
                    {busy ? "…" : "Connect"}
                  </SurfacePrimaryAction>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
