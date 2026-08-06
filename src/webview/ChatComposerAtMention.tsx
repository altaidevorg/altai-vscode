/**
 * `@file` suggestion popover: searches the workspace via HostPorts and
 * attaches the picked file as composer context.
 */

import {
  FileSuggestionList,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import type { FileMatch } from "@altai/host-contract";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  detectAtMention,
  nextAtMentionIndex,
  pathForSuggestionList,
  removeAtMentionToken,
  shouldSearchAtMention,
  type AtMentionRange,
} from "./composerAtMention.js";
import {
  addContextItem,
  basenamePath,
  newContextItemId,
  type ComposerContextItem,
} from "./composerContext.js";

export type AtMentionHandle = {
  /** True when the file suggestion list is open. */
  isOpen: () => boolean;
  /**
   * Handle arrow/enter/escape while mention is open.
   * Returns true when the key was consumed (parent should preventDefault).
   */
  handleKeyDown: (key: string) => boolean;
};

export type ChatComposerAtMentionProps = {
  prompt: string;
  cursor: number;
  items: ComposerContextItem[];
  onChangePrompt: (next: string) => void;
  onChangeItems: (items: ComposerContextItem[]) => void;
  disabled?: boolean;
  handleRef?: Ref<AtMentionHandle | null>;
};

export function ChatComposerAtMention({
  prompt,
  cursor,
  items,
  onChangePrompt,
  onChangeItems,
  disabled = false,
  handleRef,
}: ChatComposerAtMentionProps) {
  const ports = useHostPorts();
  const canSearch = useCapability("workspace.searchFiles");
  const [mention, setMention] = useState<AtMentionRange | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [matches, setMatches] = useState<FileMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceClosed, setForceClosed] = useState(false);

  const stateRef = useRef({
    mention,
    files,
    matches,
    activeIndex,
    items,
    prompt,
  });
  stateRef.current = {
    mention,
    files,
    matches,
    activeIndex,
    items,
    prompt,
  };

  useEffect(() => {
    if (disabled || !canSearch) {
      setMention(null);
      return;
    }
    const next = detectAtMention(prompt, cursor);
    setMention(next);
    if (!next) {
      setForceClosed(false);
    }
  }, [prompt, cursor, canSearch, disabled]);

  useEffect(() => {
    if (
      !mention ||
      forceClosed ||
      !canSearch ||
      !shouldSearchAtMention(mention.query)
    ) {
      setFiles([]);
      setMatches([]);
      setIndexing(false);
      return;
    }
    let cancelled = false;
    setIndexing(true);
    setError(null);
    const timer = setTimeout(() => {
      void ports.workspace
        .searchFiles(mention.query)
        .then((results) => {
          if (cancelled) {
            return;
          }
          const limited = results.slice(0, 40);
          setMatches(limited);
          setFiles(limited.map((item) => pathForSuggestionList(item.path)));
          setActiveIndex(0);
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return;
          }
          setMatches([]);
          setFiles([]);
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          if (!cancelled) {
            setIndexing(false);
          }
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mention?.query, mention, canSearch, ports, forceClosed]);

  const pickPath = (path: string, snapshot = stateRef.current): void => {
    const { matches: m, mention: open, items: current, prompt: text } =
      snapshot;
    if (!open) {
      return;
    }
    const match =
      m.find((item) => pathForSuggestionList(item.path) === path) ??
      m.find((item) => item.path.endsWith(path));
    if (!match) {
      return;
    }
    onChangeItems(
      addContextItem(current, {
        id: newContextItemId("file"),
        kind: "file",
        uri: match.uri,
        name: basenamePath(match.path),
        path: match.path,
      }),
    );
    onChangePrompt(removeAtMentionToken(text, open));
    setMention(null);
    setFiles([]);
    setMatches([]);
    setForceClosed(true);
  };

  useImperativeHandle(
    handleRef,
    () => ({
      isOpen: () =>
        Boolean(
          stateRef.current.mention &&
            !forceClosed &&
            shouldSearchAtMention(stateRef.current.mention.query),
        ),
      handleKeyDown: (key: string) => {
        const snap = stateRef.current;
        if (
          !snap.mention ||
          forceClosed ||
          !shouldSearchAtMention(snap.mention.query)
        ) {
          return false;
        }
        const next = nextAtMentionIndex(key, snap.activeIndex, snap.files.length);
        if (next.dismiss) {
          setForceClosed(true);
          return true;
        }
        if (next.activeIndex !== snap.activeIndex) {
          setActiveIndex(next.activeIndex);
          return true;
        }
        if (next.pick && snap.files[snap.activeIndex]) {
          pickPath(snap.files[snap.activeIndex]!, snap);
          return true;
        }
        return false;
      },
    }),
    [forceClosed, onChangeItems, onChangePrompt],
  );

  const open =
    Boolean(mention) &&
    !forceClosed &&
    Boolean(mention && shouldSearchAtMention(mention.query));

  if (!canSearch || !open) {
    return null;
  }

  return (
    <div className="altai-at-mention" role="listbox" aria-label="File mentions">
      {error ? (
        <p className="altai-composer-context-error" role="status">
          {error}
        </p>
      ) : null}
      <FileSuggestionList
        files={files}
        activeIndex={activeIndex}
        indexing={indexing}
        truncated={matches.length >= 40}
        hasWorkspace
        onPick={pickPath}
        onHover={setActiveIndex}
        iconUrlForFile={() => "data:image/gif;base64,R0lGODlhAQABAAAAACw="}
      />
    </div>
  );
}
