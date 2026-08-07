/**
 * Compact “connect a provider” strip above the Chat composer when the host
 * reports no connected credentials. Secrets stay in Extension Host.
 */

import {
  ProviderConnectBanner,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import type { ProviderStatus } from "@altai/host-contract";
import { useCallback, useEffect, useState } from "react";
import { formatHostUserError } from "../shared/hostUserError.js";
import {
  canMountProviderStatus,
  firstConnectableProvider,
  mergeProviderCatalog,
  shouldShowProviderConnectBanner,
} from "./providerStatusChrome.js";

export function ChatProviderConnectBanner() {
  const ports = useHostPorts();
  const canProviders = useCapability("settings.providerStatus");
  const canShow = canMountProviderStatus({ providerStatus: canProviders });
  const [ready, setReady] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canShow) {
      setProviders([]);
      setReady(false);
      return;
    }
    setError(null);
    try {
      const next = await ports.settings.getProviderStatus();
      setProviders(mergeProviderCatalog(next));
      setReady(true);
    } catch (err) {
      setError(formatHostUserError(err));
      setReady(false);
    }
  }, [ports, canShow]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = shouldShowProviderConnectBanner({
    providerStatus: canShow,
    ready,
    providers,
  });

  if (!visible) {
    return error && canShow ? (
      <p className="altai-chat-error" role="alert">
        {error}
      </p>
    ) : null;
  }

  return (
    <div className="altai-provider-connect-host">
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      <ProviderConnectBanner
  onAdd={() => {
          void (async () => {
            if (busy) {
              return;
            }
            setError(null);
            const target = firstConnectableProvider(providers);
            if (!target) {
              setError("No providers reported by the host.");
              return;
            }
            setBusy(true);
            try {
              await ports.settings.beginProviderConnection({
                providerId: target.providerId,
              });
              await load();
            } catch (err) {
              const message = formatHostUserError(err);
              if (!/cancelled/i.test(message)) {
                setError(message);
              }
            } finally {
              setBusy(false);
            }
          })();
        }}
        actionLabel={busy ? "Paste key in Cursor bar…" : "Paste API key"}
      />
    </div>
  );
}
