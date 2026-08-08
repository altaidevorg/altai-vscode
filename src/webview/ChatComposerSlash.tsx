/**
 * `/` slash-command suggestion list for the Chat composer.
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
  findSlashCommands,
  type SlashCommandMeta,
} from "./composerSlashCommands.js";

export type SlashCommandHandle = {
  isOpen: () => boolean;
  handleKeyDown: (key: string) => boolean;
};

export type ChatComposerSlashProps = {
  prompt: string;
  cursor: number;
  disabled?: boolean;
  /** Insert `/name ` (with trailing space) into the composer. */
  onPickCommand: (command: SlashCommandMeta) => void;
  handleRef?: Ref<SlashCommandHandle | null>;
};

export function ChatComposerSlash({
  prompt,
  cursor,
  disabled = false,
  onPickCommand,
  handleRef,
}: ChatComposerSlashProps) {
  const [forceClosed, setForceClosed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trigger = useMemo(() => {
    if (disabled) {
      return null;
    }
    return detectSlashOrSnippetTrigger(prompt, cursor);
  }, [prompt, cursor, disabled]);

  const { open: slashOpen, query } = resolveComposerSuggestionOpen({
    trigger,
    forceClosed,
    prefix: "/",
  });

  const matches = useMemo(
    () => (slashOpen ? findSlashCommands(query).slice(0, 24) : []),
    [slashOpen, query],
  );

  useEffect(() => {
    if (!slashOpen) {
      setForceClosed(false);
      setActiveIndex(0);
    }
  }, [slashOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const items: ComposerSuggestionItem[] = matches.map((command) => ({
    kind: "command" as const,
    name: command.name,
    label: command.label,
    description: command.description,
    category: command.category,
    aliases: command.aliases,
    icon: null,
  }));

  const stateRef = useRef({ matches, activeIndex });
  stateRef.current = { matches, activeIndex };

  useImperativeHandle(
    handleRef,
    () => ({
      isOpen: () => slashOpen && Boolean(trigger),
      handleKeyDown: (key: string) => {
        if (!slashOpen) {
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
        const command = snap.matches[action.index];
        if (command) {
          onPickCommand(command);
          setForceClosed(true);
          return true;
        }
        return false;
      },
    }),
    [slashOpen, trigger, onPickCommand],
  );

  if (!slashOpen) {
    return null;
  }

  return (
    <div className="altai-slash-commands" role="listbox" aria-label="Slash commands">
      <ComposerSuggestionList
        items={items}
        activeIndex={activeIndex}
        onPick={(item) => {
          if (item.kind !== "command") {
            return;
          }
          const command = matches.find((c) => c.name === item.name);
          if (command) {
            onPickCommand(command);
            setForceClosed(true);
          }
        }}
        onHover={setActiveIndex}
        commandPrefix="/"
      />
    </div>
  );
}
