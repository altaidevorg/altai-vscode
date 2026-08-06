/**
 * Capability-gated run/replay control for completed chat runs.
 */

import {
  ComposerToolbarIcon,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { canMountReplayControl } from "./replayChrome.js";

export type ChatReplayChromeProps = {
  chatId: string | null;
  runId: string | null;
  disabled?: boolean;
  onReplayEvents?: (count: number) => void;
  onError?: (message: string) => void;
};

export function ChatReplayChrome({
  chatId,
  runId,
  disabled = false,
  onReplayEvents,
  onError,
}: ChatReplayChromeProps) {
  const ports = useHostPorts();
  const canReplay = useCapability("runtime.replayRun");
  const canShow = canMountReplayControl({
    replay: canReplay,
    chatId,
    runId,
  });
  const [busy, setBusy] = useState(false);

  if (!canShow || !chatId || !runId) {
    return null;
  }

  return (
    <ComposerToolbarIcon
      title={busy ? "Replaying…" : "Replay run events from host"}
      disabled={disabled || busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            const page = await ports.runtime.replayRun({
              chatId,
              runId,
              limit: 200,
            });
            onReplayEvents?.(page.events.length);
          } catch (err) {
            onError?.(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.75} />
    </ComposerToolbarIcon>
  );
}
