/**
 * Settings hub control for auto context compaction (HostPorts settings).
 * Desktop ContextSection-style SettingRow when layout=settings.
 */

import { formatHostUserError, useCapability, useHostPorts } from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import { SettingsSettingRow } from "./settingsSectionLayout.js";
import { SettingsSwitch } from "./SettingsSwitch.js";

export type ChatCompactionSettingsChromeProps = {
  layout?: "inline" | "settings";
};

export function ChatCompactionSettingsChrome({
  layout = "inline",
}: ChatCompactionSettingsChromeProps = {}) {
  const ports = useHostPorts();
  const canGet = useCapability("settings.get");
  const canUpdate = useCapability("settings.update");
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canGet) {
      setReady(false);
      return;
    }
    let cancelled = false;
    void ports.settings
      .getSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }
        setEnabled(settings.compactionEnabled !== false);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(formatHostUserError(err));
          setReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ports, canGet]);

  const onToggle = useCallback(() => {
    if (!canUpdate || busy) {
      return;
    }
    const next = !enabled;
    setBusy(true);
    setError(null);
    void ports.settings
      .updateSettings({ compactionEnabled: next })
      .then((settings) => {
        setEnabled(settings.compactionEnabled !== false);
      })
      .catch((err: unknown) => {
        setError(formatHostUserError(err));
      })
      .finally(() => {
        setBusy(false);
      });
  }, [ports, canUpdate, busy, enabled]);

  if (!canGet || !canUpdate || !ready) {
    return error && canGet ? (
      <p className="altai-chat-error" role="alert">
        {error}
      </p>
    ) : null;
  }

  const switchControl = (
    <SettingsSwitch
      checked={enabled}
      disabled={busy}
      onChange={() => {
        onToggle();
      }}
    />
  );

  if (layout === "settings") {
    return (
      <div className="altai-settings-stack">
        <SettingsSettingRow
          title="Auto-compaction"
          description="When the conversation approaches the model's context window, the host may summarize older turns. Turning this off disables the automatic trigger; manual compact from the composer still works."
        >
          {switchControl}
        </SettingsSettingRow>
        <SettingsSettingRow
          title="Manual compact"
          description="Use the composer compact control (when advertised) to condense context for the active chat without waiting for the auto threshold."
        />
        {error ? (
          <p className="altai-chat-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="altai-compaction-settings">
      <label className="altai-compaction-settings-row">
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={() => {
            onToggle();
          }}
        />
        <span>
          <strong>Auto-compact context</strong>
          <span className="altai-compaction-settings-hint">
            Between-turn compaction when the host token budget is high. Manual
            compact still works from the composer.
          </span>
        </span>
      </label>
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
