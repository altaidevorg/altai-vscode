/**
 * Capability-gated provider status list for Chat / Settings.
 * API keys are typed in a VS Code password box (Extension Host) — never the Webview.
 */

import {
  SurfacePrimaryAction,
  SurfaceSecondaryAction,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import type { ProviderStatus } from "@altai/host-contract";
import { useCallback, useEffect, useState } from "react";
import { knownProviderById } from "../shared/providerCatalog.js";
import { formatHostUserError } from "../shared/hostUserError.js";
import {
  canMountProviderStatus,
  displayProviderLabel,
  mergeProviderCatalog,
  providerConsoleUrl,
} from "./providerStatusChrome.js";

export type ChatProviderStatusChromeProps = {
  /** Settings uses expanded key cards; chat uses a compact list. */
  layout?: "inline" | "settings";
  /** Fires after connect/clear when models should be reloaded by parent. */
  onProvidersChanged?: () => void;
  /** Open console docs/keys page (workspace bridge). */
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
};

export function ChatProviderStatusChrome({
  layout = "inline",
  onProvidersChanged,
  requestWorkspace,
}: ChatProviderStatusChromeProps = {}) {
  const ports = useHostPorts();
  const canProviders = useCapability("settings.providerStatus");
  const canShow = canMountProviderStatus({ providerStatus: canProviders });
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
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

  const enterApiKey = useCallback(
    async (providerId: string) => {
      const label =
        knownProviderById(providerId)?.label ?? displayProviderLabel({
          providerId,
          connected: false,
        });
      setBusyId(providerId);
      setError(null);
      setStatusMsg(
        `Look at the top of Cursor — a secure password field opens for ${label}. Paste the API key there and press Enter.`,
      );
      try {
        // Secret is typed in Extension Host UI only; Webview never sees it.
        await ports.settings.beginProviderConnection({
          providerId,
        });
        setStatusMsg(`${label} API key saved.`);
        await load();
        onProvidersChanged?.();
      } catch (err) {
        const message = formatHostUserError(err);
        if (/cancelled/i.test(message)) {
          setStatusMsg("Key entry cancelled — no key was stored.");
        } else {
          setError(message);
          setStatusMsg(null);
        }
      } finally {
        setBusyId(null);
      }
    },
    [ports, load, onProvidersChanged],
  );

  if (!canShow) {
    return null;
  }

  const cloudProviders = providers.filter(
    (p) => !knownProviderById(p.providerId)?.keyless,
  );
  const connectedCloud = cloudProviders.filter((p) => p.connected).length;
  const keylessProviders = providers.filter((p) =>
    Boolean(knownProviderById(p.providerId)?.keyless),
  );

  return (
    <section
      className={
        layout === "settings"
          ? "altai-provider-status altai-provider-status--settings"
          : "altai-provider-status"
      }
      aria-label="Provider API keys"
    >
      <div className="altai-provider-status-header">
        {layout === "settings" ? (
          <span className="altai-settings-row-desc">
            {ready
              ? `${connectedCloud} of ${cloudProviders.length} providers have a key`
              : "API keys"}
          </span>
        ) : (
          <h2 className="altai-provider-status-title">Providers</h2>
        )}
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

      {layout === "settings" ? (
        <p className="altai-provider-key-lead">
          Tap a key field or <strong>Paste API key</strong>. Cursor opens a{" "}
          <strong>secure password box at the top of the window</strong> — paste
          your key there (not into this panel). Keys never sit in the chat
          Webview.
        </p>
      ) : null}

      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
      {statusMsg ? (
        <p className="altai-provider-key-hint" role="status">
          {statusMsg}
        </p>
      ) : null}
      {!ready && !error ? (
        <p className="altai-shell-meta">Loading providers…</p>
      ) : null}

      {layout === "settings" ? (
        <ul className="altai-provider-key-grid">
          {cloudProviders.map((provider) => (
            <ProviderKeyCard
              key={provider.providerId}
              provider={provider}
              busy={busyId === provider.providerId}
              requestWorkspace={requestWorkspace}
              onEnterKey={() => void enterApiKey(provider.providerId)}
              onClear={() => {
                void (async () => {
                  setBusyId(provider.providerId);
                  setError(null);
                  setStatusMsg(null);
                  try {
                    await ports.settings.clearProviderCredential(
                      provider.providerId,
                    );
                    setStatusMsg(
                      `${displayProviderLabel(provider)} key removed.`,
                    );
                    await load();
                    onProvidersChanged?.();
                  } catch (err) {
                    setError(formatHostUserError(err));
                  } finally {
                    setBusyId(null);
                  }
                })();
              }}
            />
          ))}
        </ul>
      ) : (
        <ul className="altai-provider-status-list">
          {providers.map((provider) => {
            const busy = busyId === provider.providerId;
            const keyless = Boolean(
              knownProviderById(provider.providerId)?.keyless,
            );
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
                      provider.connected
                        ? "altai-provider-status-state is-on"
                        : "altai-provider-status-state is-off"
                    }
                  >
                    {keyless
                      ? "Local"
                      : provider.connected
                        ? "API key saved"
                        : "No key"}
                  </span>
                </div>
                <div className="altai-provider-status-actions">
                  {keyless ? null : provider.connected ? (
                    <SurfaceSecondaryAction
                      type="button"
                      disabled={busy}
                      onClick={() => void enterApiKey(provider.providerId)}
                    >
                      {busy ? "…" : "Change key"}
                    </SurfaceSecondaryAction>
                  ) : (
                    <SurfacePrimaryAction
                      type="button"
                      disabled={busy}
                      onClick={() => void enterApiKey(provider.providerId)}
                    >
                      {busy ? "…" : "Paste API key"}
                    </SurfacePrimaryAction>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {layout === "settings" && keylessProviders.length > 0 ? (
        <div className="altai-provider-local-note">
          <span className="altai-settings-row-title">Local (no key)</span>
          <span className="altai-settings-row-desc">
            {keylessProviders.map((p) => displayProviderLabel(p)).join(" · ")} —
            configure endpoints on the host; no API key required.
          </span>
        </div>
      ) : null}
    </section>
  );
}

function ProviderKeyCard({
  provider,
  busy,
  requestWorkspace,
  onEnterKey,
  onClear,
}: {
  provider: ProviderStatus;
  busy: boolean;
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
  onEnterKey: () => void;
  onClear: () => void;
}) {
  const meta = knownProviderById(provider.providerId);
  const consoleUrl = providerConsoleUrl(provider.providerId);
  const placeholder = meta?.keyHint
    ? `Paste ${meta.keyHint}`
    : "Paste API key…";
  const mask = provider.connected
    ? meta?.keyHint
      ? `${meta.keyHint.replace("…", "")}${"•".repeat(12)}`
      : `••••••••••••••••`
    : "";

  return (
    <li
      className={
        provider.connected
          ? "altai-provider-key-card is-connected"
          : "altai-provider-key-card"
      }
    >
      <div className="altai-provider-key-card-top">
        <span className="altai-provider-key-card-name">
          {displayProviderLabel(provider)}
        </span>
        <span
          className={
            provider.connected
              ? "altai-provider-status-state is-on"
              : "altai-provider-status-state is-off"
          }
        >
          {provider.connected ? "Key saved" : "No key"}
        </span>
        {consoleUrl && requestWorkspace ? (
          <button
            type="button"
            className="altai-provider-key-link"
            disabled={busy}
            onClick={() => {
              void requestWorkspace("openExternal", {
                href: consoleUrl,
              }).catch(() => undefined);
            }}
          >
            Get key ↗
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="altai-provider-key-field"
        disabled={busy}
        aria-label={
          provider.connected
            ? `Change ${displayProviderLabel(provider)} API key`
            : `Paste ${displayProviderLabel(provider)} API key`
        }
        onClick={onEnterKey}
      >
        <span className="altai-provider-key-field-value">
          {busy
            ? "Waiting for password box…"
            : provider.connected
              ? mask
              : placeholder}
        </span>
        <span className="altai-provider-key-field-action">
          {provider.connected ? "Change" : "Paste"}
        </span>
      </button>

      <div className="altai-provider-key-card-actions">
        <SurfacePrimaryAction
          type="button"
          disabled={busy}
          onClick={onEnterKey}
        >
          {busy
            ? "Enter key in Cursor bar…"
            : provider.connected
              ? "Replace API key"
              : "Paste API key"}
        </SurfacePrimaryAction>
        {provider.connected ? (
          <SurfaceSecondaryAction
            type="button"
            disabled={busy}
            onClick={onClear}
          >
            Remove key
          </SurfaceSecondaryAction>
        ) : null}
      </div>
    </li>
  );
}
