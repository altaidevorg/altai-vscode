/**
 * VS Code host composer — wraps shared `@altai/agent-ui` AiComposer with caret
 * tracking + autoresize (Desktop AiInputBar behavior).
 */

import {
  AiComposer as SharedAiComposer,
  autoresizeTextarea,
} from "@altai/agent-ui";
import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { resolveComposerCaret } from "./composerCaretChrome.js";

export type AiComposerProps = {
  busy?: boolean;
  attachments?: ReactNode;
  value: string;
  onChange: (next: string) => void;
  onCaretChange?: (caret: number) => void;
  placeholder?: string;
  disabled?: boolean;
  pickers?: ReactNode;
  onSelect?: (event: SyntheticEvent<HTMLTextAreaElement>) => void;
  onClick?: (event: MouseEvent<HTMLTextAreaElement>) => void;
  onKeyUp?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  followup?: ReactNode;
  agentSlot?: ReactNode;
  modelSlot?: ReactNode;
  tools: ReactNode;
  permission?: ReactNode;
  submit: ReactNode;
};

const COMPOSER_MAX_HEIGHT_PX = 176;

export function AiComposer({
  busy = false,
  attachments,
  value,
  onChange,
  onCaretChange,
  placeholder,
  disabled,
  pickers,
  onSelect,
  onClick,
  onKeyUp,
  onKeyDown,
  followup,
  agentSlot,
  modelSlot,
  tools,
  permission,
  submit,
}: AiComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    autoresizeTextarea(textareaRef.current, { maxPx: COMPOSER_MAX_HEIGHT_PX });
  }, [value]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => {
      autoresizeTextarea(el, { maxPx: COMPOSER_MAX_HEIGHT_PX });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  const reportCaret = (el: HTMLTextAreaElement): void => {
    onCaretChange?.(resolveComposerCaret(el.selectionStart, el.value.length));
  };

  return (
    <div className="altai-ai-composer-wrap w-full min-w-0 max-w-full">
      <SharedAiComposer
        busy={busy}
        attachments={attachments}
        value={value}
        onChange={(next) => {
          onChange(next);
          const el = textareaRef.current;
          if (el) {
            reportCaret(el);
            requestAnimationFrame(() => {
              autoresizeTextarea(el, { maxPx: COMPOSER_MAX_HEIGHT_PX });
            });
          }
        }}
        pickers={pickers}
        followup={followup}
        agentSlot={agentSlot}
        modelSlot={modelSlot}
        tools={tools}
        permission={permission}
        submit={submit}
        disabled={disabled}
        placeholder={placeholder}
        rows={2}
        textareaRef={textareaRef}
        onKeyDown={onKeyDown}
        onKeyUp={(event) => {
          reportCaret(event.currentTarget);
          onKeyUp?.(event);
        }}
        onClick={(event) => {
          reportCaret(event.currentTarget);
          onClick?.(event);
        }}
        onSelect={(event) => {
          reportCaret(event.currentTarget);
          onSelect?.(event);
        }}
        className="altai-ai-composer"
      />
    </div>
  );
}
