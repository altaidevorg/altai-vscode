/**
 * `/` slash-command suggestion list for the Chat composer.
 */

import {
  ComposerSuggestionList,
  useComposerSuggestionList,
  type ComposerSuggestionItem,
} from "@altai/agent-ui";
import { useCallback, useImperativeHandle, useMemo, type Ref } from "react";
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
  const getMatches = useCallback(
    (query: string) => findSlashCommands(query).slice(0, 24),
    [],
  );

  const {
    open,
    activeIndex,
    setActiveIndex,
    forceClose,
    isOpen,
    handleKeyDown,
    matches,
  } = useComposerSuggestionList<SlashCommandMeta>({
    prompt,
    cursor,
    prefix: "/",
    disabled,
    getMatches,
    onPick: onPickCommand,
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
      matches.map((command) => ({
        kind: "command" as const,
        name: command.name,
        label: command.label,
        description: command.description,
        category: command.category,
        aliases: command.aliases,
        icon: null,
      })),
    [matches],
  );

  if (!open) {
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
            forceClose();
          }
        }}
        onHover={setActiveIndex}
        commandPrefix="/"
      />
    </div>
  );
}
