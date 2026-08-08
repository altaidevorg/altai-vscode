/**
 * Role-styled chat transcript cards for the VS Code webview.
 * User bubbles support inline edit + resend when the host allows truncate.
 * List chrome + tool collapse live in shared AiDisplayTranscriptList (A6.38).
 */

import {
  AiDisplayTranscriptList,
  AiUserTurnBody,
  chatDisplayBubbleClassName,
  chatDisplayRoleLabel,
  hasDisplayMessageActions,
  HoverActionButton,
  lastAssistantMessageId,
  resolveDisplayMessageActions,
  TodoChecklist,
  UnifiedDiffPreview,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { File01Icon, TerminalIcon, Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import { ChatMessageContent } from "./ChatMessageContent.js";
import { type ToolGroupKind } from "./transcriptGroupChrome.js";

export type ChatMessageListProps = {
  messages: readonly ChatDisplayMessage[];
  /** Edit user turns (truncate + resend) when the host allows truncate. */
  canEditUserMessages?: boolean;
  onEditUserMessage?: (messageId: string, nextContent: string) => void;
  /** Retry last failed/last assistant turn when available. */
  canRetry?: boolean;
  onRetry?: () => void;
  editingBusy?: boolean;
  onOpenFileError?: (message: string) => void;
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
  /** Host announce preference (`off` | `polite` | `assertive`). */
  announce?: string;
};

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
  announce = "polite",
}: ChatMessageListProps) {
  const ports = useHostPorts();
  const canOpenFile = useCapability("workspace.openFile");
  const canOpenDiff = useCapability("workspace.openDiff");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lastAssistantId = lastAssistantMessageId(messages);

  const renderMessage = (message: ChatDisplayMessage) => {
    const label = chatDisplayRoleLabel(message.role);
    const isEditing = editingId === message.id;
    const {
      showEdit,
      showRetry,
      showCopy,
      showOpenFile,
      showOpenDiff,
    } = resolveDisplayMessageActions({
      message,
      lastAssistantId,
      canEditUserMessages,
      canRetry,
      canOpenFile,
      canOpenDiff,
      hasEditHandler: Boolean(onEditUserMessage),
      hasRetryHandler: Boolean(onRetry),
    });

    return (
      <article
        key={message.id}
        id={`altai-msg-${message.id}`}
        className={chatDisplayBubbleClassName(message.role)}
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
            <AiUserTurnBody
              commandName={message.commandName}
              chips={message.chips}
              textSlot={
                message.content ? (
                  <ChatMessageContent
                    content={message.content}
                    streaming={Boolean(message.streaming)}
                    onError={onOpenFileError}
                    requestWorkspace={requestWorkspace}
                  />
                ) : null
              }
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
        {(hasDisplayMessageActions({
          showEdit,
          showRetry,
          showOpenFile,
          showOpenDiff,
          showCopy,
        }) &&
          !isEditing) ? (
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
    <AiDisplayTranscriptList
      messages={messages}
      announce={announce}
      renderMessage={renderMessage}
      renderGroupIcon={groupIcon}
    />
  );
}
