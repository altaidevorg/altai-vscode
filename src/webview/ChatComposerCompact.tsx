/**
 * Capability-gated CompactNowControl for Chat (calls runtime.compactContext).
 */

import { CompactNowControl, useCapability, useHostPorts } from "@altai/agent-ui";
import { useState } from "react";
import {
  canInvokeCompact,
  canMountCompactControl,
} from "./composerCompactChrome.js";

export type ChatComposerCompactProps = {
  chatId: string | null;
  composerBusy?: boolean;
  onCompacted?: () => void;
  onError?: (message: string) => void;
};

export function ChatComposerCompact({
  chatId,
  composerBusy = false,
  onCompacted,
  onError,
}: ChatComposerCompactProps) {
  const ports = useHostPorts();
  const canCompact = useCapability("runtime.compactContext");
  const [localBusy, setLocalBusy] = useState(false);
  const busy = composerBusy || localBusy;
  const flags = {
    canCompact,
    hasActiveChat: Boolean(chatId),
    busy,
  };

  if (!canMountCompactControl(flags)) {
    return null;
  }

  return (
    <CompactNowControl
      disabled={!canInvokeCompact(flags)}
      onClick={() => {
        if (!chatId || !canInvokeCompact(flags)) {
          return;
        }
        setLocalBusy(true);
        void ports.runtime
          .compactContext({ chatId })
          .then(() => {
            onCompacted?.();
          })
          .catch((err: unknown) => {
            onError?.(err instanceof Error ? err.message : String(err));
          })
          .finally(() => {
            setLocalBusy(false);
          });
      }}
    />
  );
}
