/**
 * Role-styled chat transcript cards for the VS Code webview.
 * User bubbles support inline edit + resend when the host allows truncate.
 * List chrome + tool collapse live in shared AiDisplayTranscriptList (A6.38).
 * Bubble shell: AiDisplayMessageBubble (A6.51).
 */

import {
  AiDisplayMessageBodyExtras,
  AiDisplayMessageBubble,
  AiDisplayMessageEditForm,
  AiDisplayTranscriptList,
  AiUserTurnBody,
  displayCopyActionLabel,
  displayDiffReviewTitle,
  displayOpenDiffActionTitle,
  displayOpenFileActionTitle,
  displayOpeningActionLabel,
  hasDisplayMessageActions,
  HoverActionButton,
  lastAssistantMessageId,
  resolveDisplayMessageActions,
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

    const showActions = hasDisplayMessageActions({
      showEdit,
      showRetry,
      showOpenFile,
      showOpenDiff,
      showCopy,
    });

    return (
      <AiDisplayMessageBubble
        key={message.id}
        messageId={message.id}
        role={message.role}
        streaming={Boolean(message.streaming)}
        isEditing={isEditing}
        editSlot={
          <AiDisplayMessageEditForm
            value={draft}
            disabled={editingBusy}
            onChange={setDraft}
            onCancel={() => setEditingId(null)}
            onSave={() => {
              const next = draft.trim();
              if (next && onEditUserMessage) {
                onEditUserMessage(message.id, next);
                setEditingId(null);
              }
            }}
          />
        }
        body={
          <AiDisplayMessageBodyExtras
            originalText={message.diffOriginalText}
            proposedText={message.diffModifiedText}
            todos={message.todos}
          >
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
          </AiDisplayMessageBodyExtras>
        }
        actions={
          showActions ? (
            <>
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
                  {displayCopyActionLabel(copiedId === message.id)}
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
                  title={displayOpenDiffActionTitle(message.filePath)}
                  disabled={openingId === message.id}
                  onClick={() => {
                    setOpeningId(message.id);
                    void ports.workspace
                      .openDiff({
                        title: displayDiffReviewTitle(message.filePath),
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
                  {displayOpeningActionLabel(
                    openingId === message.id,
                    "Diff",
                  )}
                </HoverActionButton>
              ) : null}
              {showOpenFile ? (
                <HoverActionButton
                  title={displayOpenFileActionTitle(message.filePath)}
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
                  {displayOpeningActionLabel(
                    openingId === message.id,
                    "Open",
                  )}
                </HoverActionButton>
              ) : null}
            </>
          ) : undefined
        }
      />
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
