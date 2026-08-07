/**
 * Host chrome for the shared PermissionModeSwitcher.
 * Loads mode via settings port; writes via setPermissionMode when selected.
 */

import {
  PermissionModeSwitcher,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import type { PermissionMode } from "@altai/host-contract";
import { useCallback, useEffect, useState } from "react";
import { formatHostUserError } from "../shared/hostUserError.js";
import { canMountPermissionModeSwitcher } from "./permissionModeChrome.js";

export type ChatPermissionModeChromeProps = {
  /** Notify parent so startRun can include the active mode. */
  onModeChange?: (mode: PermissionMode | null) => void;
  /** Desktop composer uses toolbar-icon; settings hub uses full toolbar. */
  variant?: "toolbar" | "toolbar-icon";
  /**
   * Settings hub always offers Bypass (with confirm); composer only when
   * already enabled on the host.
   */
  showBypassAlways?: boolean;
};

export function ChatPermissionModeChrome({
  onModeChange,
  variant = "toolbar",
  showBypassAlways = false,
}: ChatPermissionModeChromeProps) {
  const ports = useHostPorts();
  const canModes = useCapability("interactive.permissionModes");
  const canGet = useCapability("settings.get");
  const canUpdate = useCapability("settings.update");
  const canShow = canMountPermissionModeSwitcher({
    permissionModes: canModes,
    settingsGet: canGet,
    settingsUpdate: canUpdate,
  });

  const [mode, setMode] = useState<PermissionMode>("plan");
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canShow) {
      setReady(false);
      onModeChange?.(null);
      return;
    }
    let cancelled = false;
    void ports.settings
      .getSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }
        setMode(settings.permissionMode);
        setBypassEnabled(Boolean(settings.bypassEnabled));
        setReady(true);
        onModeChange?.(settings.permissionMode);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(formatHostUserError(err));
        setReady(false);
        onModeChange?.(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ports, canShow, onModeChange]);

  const onSelectMode = useCallback(
    (next: PermissionMode) => {
      void (async () => {
        setError(null);
        try {
          if (next === "bypass") {
            const ok =
              typeof globalThis.confirm === "function"
                ? globalThis.confirm(
                    "Enable Bypass? Tools may run without interactive approval. Only use this in trusted workspaces.",
                  )
                : false;
            if (!ok) {
              return;
            }
            const settings = await ports.settings.updateSettings({
              bypassEnabled: true,
            });
            setMode(settings.permissionMode);
            setBypassEnabled(Boolean(settings.bypassEnabled));
            onModeChange?.(settings.permissionMode);
            return;
          }
          const applied = await ports.settings.setPermissionMode(next);
          if (bypassEnabled) {
            try {
              const settings = await ports.settings.updateSettings({
                bypassEnabled: false,
              });
              setBypassEnabled(Boolean(settings.bypassEnabled));
            } catch {
              setBypassEnabled(false);
            }
          }
          setMode(applied);
          onModeChange?.(applied);
        } catch (err) {
          setError(formatHostUserError(err));
        }
      })();
    },
    [ports, onModeChange, bypassEnabled],
  );

  if (!canShow || !ready) {
    return error && canShow ? (
      <p className="altai-chat-error" role="alert">
        {error}
      </p>
    ) : null;
  }

  return (
    <div className="altai-permission-chrome" data-variant={variant}>
      <PermissionModeSwitcher
        mode={mode}
        bypassEnabled={bypassEnabled}
        showBypass={showBypassAlways || bypassEnabled}
        onSelectMode={onSelectMode}
        variant={variant}
      />
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
