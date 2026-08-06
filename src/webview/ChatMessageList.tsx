/**
 * Role-styled chat transcript cards for the VS Code webview.
 * User bubbles support inline edit + resend when the host allows truncate.
 * Consecutive tool rows collapse into TranscriptToolGroup chrome.
 */

import {
  ContextChips,
  HoverActionButton,
  TodoChecklist,
  TranscriptToolGroup,
  UnifiedDiffPreview,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { File01Icon, TerminalIcon, Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import { ChatMessageContent } from "./ChatMessageContent.js";
import {
  buildDisplayTranscriptBlocks,
  type ToolGroupKind,
} from "./transcriptGroupChrome.js";
import { canCopyDisplayMessage } from "./messageCopyChrome.js";

export type ChatMessageListProps = {
  messages: readonly ChatDisplayMessage[];
  /** Edit user turns (truncate + resend) when host capabilities allow. */
  canEditUserMessages?: boolean;
  onEditUserMessage?: (messageId: string, nextContent: string) => void;
  /** Retry last failed/last assistant turn when available. */
  canRetry?: boolean;
  onRetry?: () => void;
  editingBusy?: boolean;
  onOpenFileError?: (message: string) => void;
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
};

function roleLabel(role: ChatDisplayMessage["role"]): string {
  switch (role) {
    case "user":
      return "You";
    case "assistant":
      return "ALTAI";
    case "tool":
      return "Tool";
    case "system":
      return "System";
    case "meta":
      return "";
    default:
      return "";
  }
}

function groupIcon(kind: ToolGroupKind) {
  const icon =
    kind === "reads"
      ? File01Icon
      : kind === "cmd"
        ? TerminalIcon
        : Globe02Icon;
  return <HugeiconsIcon icon={icon} size={12} strokeWidth={1.75} />;
}

export function ChatMessageList({
  messages,
  canEditUserMessages = false,
  onEditUserMessage,
  canRetry = false,
  onRetry,
  editingBusy = false,
  onOpenFileError,
  requestWorkspace,
}: ChatMessageListProps) {
  const ports = useHostPorts();
  const canOpenFile = useCapability("workspace.openFile");
  const canOpenDiff = useCapability("workspace.openDiff");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lastAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  const blocks = useMemo(
    () => buildDisplayTranscriptBlocks(messages),
    [messages],
  );

  const renderMessage = (message: ChatDisplayMessage) => {
    const label = roleLabel(message.role);
    const isEditing = editingId === message.id;
    const showEdit =
      message.role === "user" &&
      canEditUserMessages &&
      Boolean(onEditUserMessage) &&
      !message.streaming;
    const showRetry =
      message.role === "assistant" &&
      message.id === lastAssistantId &&
      canRetry &&
      Boolean(onRetry) &&
      !message.streaming;
    const showOpenFile =
      message.role === "tool" &&
      canOpenFile &&
      Boolean(message.fileUri) &&
      !message.streaming;
    const showOpenDiff =
      message.role === "tool" &&
      canOpenDiff &&
      message.diffOriginalText !== undefined &&
      message.diffModifiedText !== undefined &&
      !message.streaming;
    const showCopy = canCopyDisplayMessage(message);

    return (
      <article
        key={message.id}
        id={`altai-msg-${message.id}`}
        className={
          message.role === "user"
            ? "altai-chat-bubble altai-chat-bubble--user"
            : message.role === "assistant"
              ? "altai-chat-bubble altai-chat-bubble--assistant"
              : message.role === "tool"
                ? "altai-chat-bubble altai-chat-bubble--tool"
                : "altai-chat-bubble altai-chat-bubble--meta"
        }
        data-role={message.role}
        data-streaming={message.streaming ? "true" : undefined}
      >
        {label ? (
          <header className="altai-chat-bubble-label">{label}</header>
        ) : null}
        {isEditing ? (
          <div className="altai-chat-edit">
            <textarea
              className="altai-chat-edit-input"
              value={draft}
              rows={3}
              aria-label="Edit message"
              disabled={editingBusy}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.metaKey || event.ctrlKey) &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  const next = draft.trim();
                  if (next && onEditUserMessage) {
                    onEditUserMessage(message.id, next);
                    setEditingId(null);
                  }
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setEditingId(null);
                }
              }}
            />
            <div className="altai-chat-edit-actions">
              <button
                type="button"
                className="altai-composer-stop"
                disabled={editingBusy}
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="altai-composer-submit"
                disabled={editingBusy || !draft.trim()}
                onClick={() => {
                  const next = draft.trim();
                  if (next && onEditUserMessage) {
                    onEditUserMessage(message.id, next);
                    setEditingId(null);
                  }
                }}
              >
                {editingBusy ? "Saving…" : "Save & resend"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.chips && message.chips.length > 0 ? (
              <ContextChips chips={message.chips} />
            ) : null}
            <ChatMessageContent
              content={message.content}
              streaming={Boolean(message.streaming)}
              onError={onOpenFileError}
              requestWorkspace={requestWorkspace}
            />
            {message.diffOriginalText !== undefined &&
            message.diffModifiedText !== undefined ? (
              <div className="altai-chat-inline-diff">
                <UnifiedDiffPreview
                  original={message.diffOriginalText}
                  proposed={message.diffModifiedText}
                />
              </div>
            ) : null}
            {message.todos && message.todos.length > 0 ? (
              <div className="altai-chat-todos">
                <TodoChecklist items={message.todos} dense />
              </div>
            ) : null}
          </>
        )}
        {(showEdit || showRetry || showOpenFile || showOpenDiff || showCopy) &&
        !isEditing ? (
          <footer className="altai-chat-bubble-actions">
            {showCopy ? (
              <HoverActionButton
                title="Copy message"
                onClick={() => {
                  void (async () => {
                    try {
                      await navigator.clipboard.writeText(message.content);
                      setCopiedId(message.id);
                      window.setTimeout(() => {
                        setCopiedId((id) =>
                          id === message.id ? null : id,
                        );
                      }, 1500);
                    } catch (err: unknown) {
                      onOpenFileError?.(
                        err instanceof Error ? err.message : String(err),
                      );
                    }
                  })();
                }}
              >
                {copiedId === message.id ? "Copied" : "Copy"}
              </HoverActionButton>
            ) : null}
            {showEdit ? (
              <HoverActionButton
                title="Edit message"
                disabled={editingBusy}
                onClick={() => {
                  setEditingId(message.id);
                  setDraft(message.content);
                }}
              >
                Edit
              </HoverActionButton>
            ) : null}
            {showRetry ? (
              <HoverActionButton
                title="Retry"
                disabled={editingBusy}
                onClick={() => onRetry?.()}
              >
                Retry
              </HoverActionButton>
            ) : null}
            {showOpenDiff ? (
              <HoverActionButton
                title={
                  message.filePath
                    ? `Review diff for ${message.filePath}`
                    : "Open diff"
                }
                disabled={openingId === message.id}
                onClick={() => {
                  setOpeningId(message.id);
                  void ports.workspace
                    .openDiff({
                      title: message.filePath
                        ? `ALTAI · ${message.filePath}`
                        : "ALTAI review",
                      originalText: message.diffOriginalText ?? "",
                      modifiedText: message.diffModifiedText ?? "",
                      ...(message.filePath
                        ? { path: message.filePath }
                        : {}),
                    })
                    .catch((err: unknown) => {
                      onOpenFileError?.(
                        err instanceof Error ? err.message : String(err),
                      );
                    })
                    .finally(() => {
                      setOpeningId(null);
                    });
                }}
              >
                {openingId === message.id ? "Opening…" : "Diff"}
              </HoverActionButton>
            ) : null}
            {showOpenFile ? (
              <HoverActionButton
                title={
                  message.filePath
                    ? `Open ${message.filePath}`
                    : "Open file"
                }
                disabled={openingId === message.id}
                onClick={() => {
                  const uri = message.fileUri;
                  if (!uri) {
                    return;
                  }
                  setOpeningId(message.id);
                  void ports.workspace
                    .openFile(uri)
                    .catch((err: unknown) => {
                      onOpenFileError?.(
                        err instanceof Error ? err.message : String(err),
                      );
                    })
                    .finally(() => {
                      setOpeningId(null);
                    });
                }}
              >
                {openingId === message.id ? "Opening…" : "Open"}
              </HoverActionButton>
            ) : null}
          </footer>
        ) : null}
      </article>
    );
  };

  return (
    <div
      className="altai-chat-log"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      id="altai-active-chat"
    >
      {blocks.map((block) => {
        if (block.kind === "message") {
          return renderMessage(block.message as ChatDisplayMessage);
        }
        const kind = block.groupKind;
        return (
          <div
            key={block.key}
            className="altai-chat-tool-group"
            data-kind={kind}
          >
            <TranscriptToolGroup
              label={block.label}
              countLabel={block.countLabel}
              preview={block.preview}
              icon={groupIcon(kind)}
              previewMono={kind === "reads" || kind === "cmd"}
            >
              {block.messages.map((message) =>
                renderMessage(message as ChatDisplayMessage),
              )}
            </TranscriptToolGroup>
          </div>
        );
      })}
    </div>
  );
}
