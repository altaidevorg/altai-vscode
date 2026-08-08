/**
 * `#snippet` suggestion list for the Chat composer.
 */

import {
  ComposerSuggestionList,
  detectSlashOrSnippetTrigger,
  resolveComposerSuggestionKeyAction,
  resolveComposerSuggestionOpen,
  type ComposerSuggestionItem,
} from "@altai/agent-ui";
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
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
  const [forceClosed, setForceClosed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trigger = useMemo(() => {
    if (disabled) {
      return null;
    }
    return detectSlashOrSnippetTrigger(prompt, cursor);
  }, [prompt, cursor, disabled]);

  const { open: snippetOpen, query } = resolveComposerSuggestionOpen({
    trigger,
    forceClosed,
    prefix: "#",
  });

  const matches = useMemo(
    () => (snippetOpen ? findSnippets(catalog, query).slice(0, 24) : []),
    [snippetOpen, catalog, query],
  );

  useEffect(() => {
    if (!snippetOpen) {
      setForceClosed(false);
      setActiveIndex(0);
    }
  }, [snippetOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const items: ComposerSuggestionItem[] = matches.map((snippet) => ({
    kind: "snippet" as const,
    id: snippet.id,
    handle: snippet.handle,
    name: snippet.name,
    description: snippet.description,
  }));

  const stateRef = useRef({ matches, activeIndex });
  stateRef.current = { matches, activeIndex };

  useImperativeHandle(
    handleRef,
    () => ({
      isOpen: () => snippetOpen && Boolean(trigger),
      handleKeyDown: (key: string) => {
        if (!snippetOpen) {
          return false;
        }
        const snap = stateRef.current;
        const action = resolveComposerSuggestionKeyAction(key, {
          matchCount: snap.matches.length,
          activeIndex: snap.activeIndex,
        });
        if (action.type === "close") {
          setForceClosed(true);
          return true;
        }
        if (action.type === "ignore") {
          return false;
        }
        if (action.type === "move") {
          setActiveIndex(action.index);
          return true;
        }
        const snippet = snap.matches[action.index];
        if (snippet) {
          onPickSnippet(snippet);
          setForceClosed(true);
          return true;
        }
        return false;
      },
    }),
    [snippetOpen, trigger, onPickSnippet],
  );

  if (!snippetOpen) {
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
            setForceClosed(true);
          }
        }}
        onHover={setActiveIndex}
        commandPrefix="#"
      />
    </div>
  );
}
