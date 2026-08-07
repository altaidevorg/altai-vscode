/**
 * Preference patch helper for Studio-style settings panels.
 */

import { useCallback, useEffect, useState } from "react";
import {
  coerceExtensionPreferences,
  defaultExtensionPreferences,
  type ExtensionPreferences,
  type ExtensionSettingKey,
} from "../shared/extensionPreferences.js";
import { formatHostUserError } from "../shared/hostUserError.js";

export function useExtensionPreferences(
  requestWorkspace: (method: string, params?: unknown) => Promise<unknown>,
): {
  prefs: ExtensionPreferences;
  ready: boolean;
  error: string | null;
  busyKey: ExtensionSettingKey | null;
  reload: () => Promise<void>;
  patch: (
    key: ExtensionSettingKey,
    value: string | boolean | number | null,
  ) => Promise<void>;
} {
  const [prefs, setPrefs] = useState<ExtensionPreferences>(
    defaultExtensionPreferences,
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<ExtensionSettingKey | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const next = coerceExtensionPreferences(
        (await requestWorkspace("getExtensionSettings")) as Record<
          string,
          unknown
        >,
      );
      setPrefs(next);
      setReady(true);
    } catch (err) {
      setError(formatHostUserError(err));
      setReady(false);
    }
  }, [requestWorkspace]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patch = useCallback(
    async (
      key: ExtensionSettingKey,
      value: string | boolean | number | null,
    ) => {
      setBusyKey(key);
      setError(null);
      try {
        const next = coerceExtensionPreferences(
          (await requestWorkspace("updateExtensionSetting", {
            key,
            value,
          })) as Record<string, unknown>,
        );
        setPrefs(next);
      } catch (err) {
        setError(formatHostUserError(err));
      } finally {
        setBusyKey(null);
      }
    },
    [requestWorkspace],
  );

  return { prefs, ready, error, busyKey, reload, patch };
}
