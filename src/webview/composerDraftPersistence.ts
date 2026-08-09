/**
 * Debounced composer draft persistence for the VS Code webview shell.
 * Debounce / immediate-flush policy is injected (typically from @altai/agent-ui).
 */

export type ComposerDraftTimers = {
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
};

export type ComposerDraftPersistenceOptions = {
  debounceMs: number;
  shouldPersistImmediately: (draft: string) => boolean;
};

export type ComposerDraftPersistence = {
  onChange: (draft: string) => void;
  flush: () => void;
};

/**
 * Schedule drafts to `persist`, flushing immediately when
 * `shouldPersistImmediately` returns true, otherwise after `debounceMs`.
 */
export function createComposerDraftPersistence(
  persist: (draft: string) => void,
  timers: ComposerDraftTimers,
  options: ComposerDraftPersistenceOptions,
): ComposerDraftPersistence {
  let timer: number | null = null;
  let pending: string | null = null;
  const { debounceMs, shouldPersistImmediately } = options;

  function flush(): void {
    if (timer !== null) {
      timers.clearTimeout(timer);
      timer = null;
    }
    if (pending !== null) {
      persist(pending);
      pending = null;
    }
  }

  function onChange(draft: string): void {
    pending = draft;
    if (shouldPersistImmediately(draft)) {
      flush();
      return;
    }
    if (timer !== null) {
      timers.clearTimeout(timer);
    }
    timer = timers.setTimeout(() => {
      timer = null;
      if (pending !== null) {
        persist(pending);
        pending = null;
      }
    }, debounceMs);
  }

  return { onChange, flush };
}
