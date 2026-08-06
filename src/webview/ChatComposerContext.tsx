/**
 * Capability-gated attach menu for active file, selection, git diff, terminal.
 */

import {
  ComposerAttachChips,
  ComposerToolbarIcon,
  ContextAction,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import {
  CodeIcon,
  File01Icon,
  GitBranchIcon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";
import {
  addContextItem,
  basenamePath,
  countLines,
  listOpenableContextItems,
  newContextItemId,
  removeContextItem,
  toComposerAttachFiles,
  type ComposerContextItem,
} from "./composerContext.js";
import {
  formatGitDiffSummary,
  formatTerminalAttachText,
} from "./composerAttachChrome.js";
import { type Snippet } from "./composerSnippets.js";

export type ChatComposerContextProps = {
  items: ComposerContextItem[];
  onChange: (items: ComposerContextItem[]) => void;
  snippets?: readonly Snippet[];
  onRemoveSnippet?: (id: string) => void;
  disabled?: boolean;
};

export function ChatComposerContext({
  items,
  onChange,
  snippets = [],
  onRemoveSnippet,
  disabled = false,
}: ChatComposerContextProps) {
  const ports = useHostPorts();
  const canActiveFile = useCapability("workspace.activeFile");
  const canSelection = useCapability("workspace.selection");
  const canGitDiff = useCapability("workspace.gitDiff");
  const canTerminal = useCapability("workspace.terminalContext");
  const canOpenFile = useCapability("workspace.openFile");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const show =
    canActiveFile || canSelection || canGitDiff || canTerminal;
  const openable = canOpenFile ? listOpenableContextItems(items) : [];

  const pushError = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : String(err));
  }, []);

  const attachActiveFile = async (): Promise<void> => {
    if (!canActiveFile) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const file = await ports.workspace.getActiveFile();
      if (!file) {
        setError("No active workspace file");
        return;
      }
      onChange(
        addContextItem(items, {
          id: newContextItemId("file"),
          kind: "file",
          uri: file.uri,
          name: basenamePath(file.path),
          path: file.path,
        }),
      );
      setMenuOpen(false);
    } catch (err) {
      pushError(err);
    } finally {
      setBusy(false);
    }
  };

  const attachSelection = async (): Promise<void> => {
    if (!canSelection) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const selection = await ports.workspace.getSelection();
      if (!selection || !selection.text.trim()) {
        setError("No editor selection");
        return;
      }
      onChange(
        addContextItem(items, {
          id: newContextItemId("selection"),
          kind: "selection",
          uri: selection.uri,
          path: selection.path,
          text: selection.text,
          lines: countLines(selection.text),
        }),
      );
      setMenuOpen(false);
    } catch (err) {
      pushError(err);
    } finally {
      setBusy(false);
    }
  };

  const attachGitDiff = async (): Promise<void> => {
    if (!canGitDiff) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const diff = await ports.workspace.getGitDiff();
      const patch =
        diff?.patch?.trim() ||
        formatGitDiffSummary({
          ...(diff?.branch ? { branch: diff.branch } : {}),
          files: diff?.files ?? [],
        }) ||
        "";
      if (!patch) {
        setError("No git diff available");
        return;
      }
      const name = diff?.branch ? `diff · ${diff.branch}` : "Working tree diff";
      onChange(
        addContextItem(items, {
          id: newContextItemId("diff"),
          kind: "diff",
          name,
          text: patch,
          lines: countLines(patch),
        }),
      );
      setMenuOpen(false);
    } catch (err) {
      pushError(err);
    } finally {
      setBusy(false);
    }
  };

  const attachTerminal = async (): Promise<void> => {
    if (!canTerminal) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const terminal = await ports.workspace.getTerminalContext();
      const text = formatTerminalAttachText({
        selectedText: terminal?.selectedText,
        lastCommand: terminal?.lastCommand,
        cwd: terminal?.cwd,
      });
      if (!text) {
        setError("No terminal context");
        return;
      }
      onChange(
        addContextItem(items, {
          id: newContextItemId("terminal"),
          kind: "terminal",
          name: terminal?.cwd ? basenamePath(terminal.cwd) : "Terminal",
          text,
          lines: countLines(text),
        }),
      );
      setMenuOpen(false);
    } catch (err) {
      pushError(err);
    } finally {
      setBusy(false);
    }
  };

  const attachSnippets = snippets.map((s) => ({
    id: s.id,
    handle: s.handle,
    description: s.description || s.name,
  }));

  if (!show && attachSnippets.length === 0) {
    return null;
  }

  return (
    <div className="altai-composer-context">
      <ComposerAttachChips
        files={toComposerAttachFiles(items)}
        onRemoveFile={(id) => onChange(removeContextItem(items, id))}
        snippets={attachSnippets}
        onRemoveSnippet={(id) => {
          onRemoveSnippet?.(id);
        }}
        commands={[]}
        onRemoveCommand={() => {}}
      />
      {openable.length > 0 ? (
        <div
          className="altai-composer-open-attachments"
          role="group"
          aria-label="Open attached files"
        >
          {openable.map((item) => (
            <button
              key={item.id}
              type="button"
              className="altai-composer-open-attachment"
              title={`Open ${item.label}`}
              disabled={disabled || busy || openingId !== null}
              onClick={() => {
                setOpeningId(item.id);
                setError(null);
                void ports.workspace
                  .openFile(item.uri)
                  .catch((err: unknown) => {
                    pushError(err);
                  })
                  .finally(() => {
                    setOpeningId(null);
                  });
              }}
            >
              {openingId === item.id ? "Opening…" : `Open ${item.label}`}
            </button>
          ))}
        </div>
      ) : null}
      {show ? (
        <div className="altai-composer-context-row">
          <ComposerToolbarIcon
            title="Attach context"
            disabled={disabled || busy}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <HugeiconsIcon icon={File01Icon} size={14} strokeWidth={1.75} />
          </ComposerToolbarIcon>
          {error ? (
            <span className="altai-composer-context-error" role="status">
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
      {show && menuOpen ? (
        <div
          className="altai-composer-context-menu"
          role="menu"
          aria-label="Attach context"
        >
          {canActiveFile ? (
            <ContextAction
              icon={File01Icon}
              label="Active file"
              detail="Attach the file open in the editor"
              disabled={disabled || busy}
              onClick={() => {
                void attachActiveFile();
              }}
            />
          ) : null}
          {canSelection ? (
            <ContextAction
              icon={CodeIcon}
              label="Editor selection"
              detail="Attach the current selection"
              disabled={disabled || busy}
              onClick={() => {
                void attachSelection();
              }}
            />
          ) : null}
          {canGitDiff ? (
            <ContextAction
              icon={GitBranchIcon}
              label="Working tree diff"
              detail="Attach git diff for the workspace"
              disabled={disabled || busy}
              onClick={() => {
                void attachGitDiff();
              }}
            />
          ) : null}
          {canTerminal ? (
            <ContextAction
              icon={TerminalIcon}
              label="Terminal context"
              detail="Attach selected terminal output or last command"
              disabled={disabled || busy}
              onClick={() => {
                void attachTerminal();
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
