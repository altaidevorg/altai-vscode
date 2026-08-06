/**
 * Role-styled chat transcript cards for the VS Code webview.
 */

import type { ChatDisplayMessage } from "./chatDisplayMessage.js";

export type ChatMessageListProps = {
  messages: readonly ChatDisplayMessage[];
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

export function ChatMessageList({ messages }: ChatMessageListProps) {
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
            <p className="altai-chat-bubble-body">
              {message.content}
              {message.streaming ? (
                <span className="altai-chat-streaming" aria-hidden="true">
                  ▍
                </span>
              ) : null}
            </p>
          </article>
        );
      })}
    </div>
  );
}
