/**
 * Capability-gated attach menu for active file, selection, git diff, terminal.
 * Layout matches Desktop AiInputBar: chips in attachments slot, Code control in
 * the primary toolbar tools cluster.
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
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildDiffContextItem,
  buildFileContextItem,
  buildSelectionContextItem,
  buildTerminalContextItem,
} from "./composerAttachChrome.js";
import {
  addContextItem,
  listOpenableContextItems,
  removeContextItem,
  toComposerAttachFiles,
  type ComposerContextItem,
} from "./composerContext.js";
import { type Snippet } from "./composerSnippets.js";

export type ChatComposerContextSurface = "attachments" | "toolbar" | "all";

export type ChatComposerContextProps = {
  items: ComposerContextItem[];
  onChange: (items: ComposerContextItem[]) => void;
  snippets?: readonly Snippet[];
  onRemoveSnippet?: (id: string) => void;
  disabled?: boolean;
  /**
   * - attachments: chips + open-file links (ComposerShell attachments slot)
   * - toolbar: context menu control (ComposerPrimaryRow tools)
   * - all: both (legacy single mount)
   */
  surface?: ChatComposerContextSurface;
};

export function ChatComposerContext({
  items,
  onChange,
  snippets = [],
  onRemoveSnippet,
  disabled = false,
  surface = "all",
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
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const showAttach =
    canActiveFile || canSelection || canGitDiff || canTerminal;
  const openable = canOpenFile ? listOpenableContextItems(items) : [];
  const showAttachments = surface === "attachments" || surface === "all";
  const showToolbar = surface === "toolbar" || surface === "all";

  const pushError = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : String(err));
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDoc = (event: PointerEvent) => {
      if (
        toolbarRef.current &&
        event.target instanceof Node &&
        !toolbarRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const attachActiveFile = async (): Promise<void> => {
    if (!canActiveFile) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const file = await ports.workspace.getActiveFile();
      const item = buildFileContextItem(file);
      if (!item) {
        setError("No active workspace file");
        return;
      }
      onChange(addContextItem(items, item));
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
      const item = buildSelectionContextItem(selection);
      if (!item) {
        setError("No editor selection");
        return;
      }
      onChange(addContextItem(items, item));
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
      const item = buildDiffContextItem(diff);
      if (!item) {
        setError("No git diff available");
        return;
      }
      onChange(addContextItem(items, item));
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
      const item = buildTerminalContextItem(terminal);
      if (!item) {
        setError("No terminal context");
        return;
      }
      onChange(addContextItem(items, item));
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

  const hasAttachmentSurface =
    items.length > 0 || attachSnippets.length > 0 || openable.length > 0;

  if (showAttachments && !showToolbar && !hasAttachmentSurface) {
    return null;
  }
  if (showToolbar && !showAttachments && !showAttach) {
    return null;
  }
  if (!showAttach && attachSnippets.length === 0 && !hasAttachmentSurface) {
    return null;
  }

  return (
    <>
      {showAttachments && hasAttachmentSurface ? (
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
        </div>
      ) : null}
      {showToolbar && showAttach ? (
        <div className="altai-composer-context-toolbar" ref={toolbarRef}>
          <ComposerToolbarIcon
            title="Add workspace context"
            disabled={disabled || busy}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <HugeiconsIcon icon={CodeIcon} size={14} strokeWidth={1.75} />
          </ComposerToolbarIcon>
          {error ? (
            <span className="altai-composer-context-error" role="status">
              {error}
            </span>
          ) : null}
          {menuOpen ? (
            <div
              className="altai-composer-context-menu altai-composer-context-menu--popover"
              role="menu"
              aria-label="Attach context"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
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
      ) : null}
    </>
  );
}
