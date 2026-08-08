/**
 * VS Code host adapter for display message body content (A6.57).
 * Shared segment rendering lives in `@altai/agent-ui`; this file owns
 * HostPorts openFile + openExternal transport.
 */

import {
  AiDisplayMessageContent,
  isHttpUrl,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useState } from "react";
import { pathToFileUri } from "./chatDisplayMessage.js";

export type ChatMessageContentProps = {
  content: string;
  streaming?: boolean;
  onError?: (message: string) => void;
  /**
   * Extension Host workspace RPC (same transport as HostPorts.workspace).
   * Used for openExternal which is not yet on the shared HostPorts surface.
   */
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
};

export function ChatMessageContent({
  content,
  streaming = false,
  onError,
  requestWorkspace,
}: ChatMessageContentProps) {
  const ports = useHostPorts();
  const canOpenFile = useCapability("workspace.openFile");
  const [busy, setBusy] = useState(false);

  const openPath = (path: string) => {
    if (!canOpenFile || busy) {
      return;
    }
    setBusy(true);
    const uri = path.startsWith("file:") ? path : pathToFileUri(path);
    void ports.workspace
      .openFile(uri)
      .catch((err: unknown) => {
        onError?.(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const openUrl = (href: string) => {
    if (!requestWorkspace || busy || !isHttpUrl(href)) {
      return;
    }
    setBusy(true);
    void requestWorkspace("openExternal", { href })
      .catch((err: unknown) => {
        onError?.(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <AiDisplayMessageContent
      content={content}
      streaming={streaming}
      canOpenFile={canOpenFile}
      canOpenUrl={Boolean(requestWorkspace)}
      busy={busy}
      onOpenPath={openPath}
      onOpenUrl={openUrl}
    />
  );
}
