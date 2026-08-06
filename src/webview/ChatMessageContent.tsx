/**
 * Renders chat bubble body with path links, HTTP labels, and fenced code.
 */

import {
  ChatExternalLink,
  ChatPathLink,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useState } from "react";
import {
  isHttpUrl,
  segmentChatContent,
  type ChatContentSegment,
} from "./chatContentSegments.js";
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
  const segments = segmentChatContent(content);

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
    <div className="altai-chat-bubble-body">
      {segments.map((segment, index) => (
        <Segment
          key={`${segment.kind}:${index}:${
            segment.kind === "text" || segment.kind === "code"
              ? segment.text.slice(0, 24)
              : segment.kind === "path"
                ? segment.path
                : segment.href
          }`}
          segment={segment}
          canOpenFile={canOpenFile}
          canOpenUrl={Boolean(requestWorkspace)}
          busy={busy}
          onOpenPath={openPath}
          onOpenUrl={openUrl}
        />
      ))}
      {streaming ? (
        <span className="altai-chat-streaming" aria-hidden="true">
          ▍
        </span>
      ) : null}
    </div>
  );
}

function Segment({
  segment,
  canOpenFile,
  canOpenUrl,
  busy,
  onOpenPath,
  onOpenUrl,
}: {
  segment: ChatContentSegment;
  canOpenFile: boolean;
  canOpenUrl: boolean;
  busy: boolean;
  onOpenPath: (path: string) => void;
  onOpenUrl: (href: string) => void;
}) {
  if (segment.kind === "text") {
    return <>{segment.text}</>;
  }
  if (segment.kind === "code") {
    return (
      <pre className="altai-chat-code" data-lang={segment.lang ?? undefined}>
        <code>{segment.text}</code>
      </pre>
    );
  }
  if (segment.kind === "path") {
    if (!canOpenFile) {
      return (
        <span className="altai-chat-path is-static" title={segment.path}>
          {segment.text}
        </span>
      );
    }
    return (
      <ChatPathLink
        path={segment.path}
        onOpen={() => {
          if (!busy) {
            onOpenPath(segment.path);
          }
        }}
        className="altai-chat-path"
      >
        {segment.text}
      </ChatPathLink>
    );
  }
  if (!canOpenUrl) {
    return (
      <span className="altai-chat-url is-static" title={segment.href}>
        {segment.text}
      </span>
    );
  }
  return (
    <ChatExternalLink
      href={segment.href}
      onOpen={() => {
        if (!busy) {
          onOpenUrl(segment.href);
        }
      }}
      className="altai-chat-url"
    >
      {segment.text}
    </ChatExternalLink>
  );
}
