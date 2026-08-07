/**
 * `/` slash-command suggestion list for the Chat composer.
 */

import {
  ComposerSuggestionList,
  detectSlashOrSnippetTrigger,
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

  const slashOpen =
    Boolean(trigger) &&
    trigger?.prefix === "/" &&
    !forceClosed;

  const query = slashOpen && trigger ? trigger.query : "";
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
        if (key === "Escape") {
          setForceClosed(true);
          return true;
        }
        // Empty list: do not steal Enter (submit) or arrows.
        if (snap.matches.length === 0) {
          return false;
        }
        if (key === "ArrowDown") {
          setActiveIndex((i) =>
            Math.min(snap.matches.length - 1, i + 1),
          );
          return true;
        }
        if (key === "ArrowUp") {
          setActiveIndex((i) => Math.max(0, i - 1));
          return true;
        }
        if (key === "Enter" || key === "Tab") {
          const command = snap.matches[snap.activeIndex];
          if (command) {
            onPickCommand(command);
            setForceClosed(true);
            return true;
          }
        }
        return false;
      },
    }),
    [slashOpen, matches.length, trigger, onPickCommand],
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
