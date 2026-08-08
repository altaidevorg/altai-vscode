/**
 * Capability-gated CompactNowControl for Chat (calls runtime.compactContext).
 * Shared mount policy + chrome in AiComposerCompactControl (A6.61).
 */

import {
  AiComposerCompactControl,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useState } from "react";

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

  return (
    <AiComposerCompactControl
      canCompact={canCompact}
      hasActiveChat={Boolean(chatId)}
      busy={busy}
      onCompact={() => {
        if (!chatId || busy) {
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
