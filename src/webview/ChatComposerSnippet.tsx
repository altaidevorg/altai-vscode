/**
 * `#snippet` suggestion list for the Chat composer.
 */

import {
  ComposerSuggestionList,
  useComposerSuggestionList,
  type ComposerSuggestionItem,
} from "@altai/agent-ui";
import { useCallback, useImperativeHandle, useMemo, type Ref } from "react";
import {
  findSnippets,
  type Snippet,
} from "./composerSnippets.js";

export type SnippetHandle = {
  isOpen: () => boolean;
  handleKeyDown: (key: string) => boolean;
};

export type ChatComposerSnippetProps = {
  prompt: string;
  cursor: number;
  catalog: readonly Snippet[];
  disabled?: boolean;
  onPickSnippet: (snippet: Snippet) => void;
  handleRef?: Ref<SnippetHandle | null>;
};

export function ChatComposerSnippet({
  prompt,
  cursor,
  catalog,
  disabled = false,
  onPickSnippet,
  handleRef,
}: ChatComposerSnippetProps) {
  const getMatches = useCallback(
    (query: string) => findSnippets(catalog, query).slice(0, 24),
    [catalog],
  );

  const {
    open,
    activeIndex,
    setActiveIndex,
    forceClose,
    isOpen,
    handleKeyDown,
    matches,
  } = useComposerSuggestionList<Snippet>({
    prompt,
    cursor,
    prefix: "#",
    disabled,
    getMatches,
    onPick: onPickSnippet,
  });

  useImperativeHandle(
    handleRef,
    () => ({
      isOpen,
      handleKeyDown,
    }),
    [isOpen, handleKeyDown],
  );

  const items: ComposerSuggestionItem[] = useMemo(
    () =>
      matches.map((snippet) => ({
        kind: "snippet" as const,
        id: snippet.id,
        handle: snippet.handle,
        name: snippet.name,
        description: snippet.description,
      })),
    [matches],
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="altai-snippet-suggestions"
      role="listbox"
      aria-label="Prompt snippets"
    >
      <ComposerSuggestionList
        items={items}
        activeIndex={activeIndex}
        onPick={(item) => {
          if (item.kind !== "snippet") {
            return;
          }
          const snippet = matches.find((s) => s.id === item.id);
          if (snippet) {
            onPickSnippet(snippet);
            forceClose();
          }
        }}
        onHover={setActiveIndex}
        commandPrefix="#"
      />
    </div>
  );
}
