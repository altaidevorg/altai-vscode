/**
 * Role-styled chat transcript cards for the VS Code webview.
 * User bubbles support inline edit + resend when the host allows truncate.
 */

import { HoverActionButton } from "@altai/agent-ui";
import { useState } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";

export type ChatMessageListProps = {
  messages: readonly ChatDisplayMessage[];
  /** Edit user turns (truncate + resend) when host capabilities allow. */
  canEditUserMessages?: boolean;
  onEditUserMessage?: (messageId: string, nextContent: string) => void;
  /** Retry last failed/last assistant turn when available. */
  canRetry?: boolean;
  onRetry?: () => void;
  editingBusy?: boolean;
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

export function ChatMessageList({
  messages,
  canEditUserMessages = false,
  onEditUserMessage,
  canRetry = false,
  onRetry,
  editingBusy = false,
}: ChatMessageListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const lastAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  return (
    <div
      className="altai-chat-log"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      id="altai-active-chat"
    >
      {messages.map((message) => {
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

        return (
          <article
            key={message.id}
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
              <p className="altai-chat-bubble-body">
                {message.content}
                {message.streaming ? (
                  <span className="altai-chat-streaming" aria-hidden="true">
                    ▍
                  </span>
                ) : null}
              </p>
            )}
            {(showEdit || showRetry) && !isEditing ? (
              <footer className="altai-chat-bubble-actions">
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
              </footer>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
