import { describe, expect, it, vi } from "vitest";
import { createComposerDraftPersistence } from "../../src/webview/composerDraftPersistence.js";

function fakeTimers() {
  let nextId = 1;
  const pending = new Map<number, { fn: () => void; ms: number }>();
  return {
    timers: {
      setTimeout: (fn: () => void, ms: number) => {
        const id = nextId++;
        pending.set(id, { fn, ms });
        return id;
      },
      clearTimeout: (id: number) => {
        pending.delete(id);
      },
    },
    flushAll() {
      for (const [id, entry] of [...pending.entries()]) {
        pending.delete(id);
        entry.fn();
      }
    },
    count() {
      return pending.size;
    },
  };
}

describe("createComposerDraftPersistence", () => {
  it("persists when immediate policy matches", () => {
    const persist = vi.fn();
    const clock = fakeTimers();
    const api = createComposerDraftPersistence(persist, clock.timers, {
      debounceMs: 200,
      shouldPersistImmediately: (draft) => draft.length === 0,
    });
    api.onChange("");
    expect(persist).toHaveBeenCalledWith("");
    expect(clock.count()).toBe(0);
  });

  it("debounces non-immediate drafts", () => {
    const persist = vi.fn();
    const clock = fakeTimers();
    const api = createComposerDraftPersistence(persist, clock.timers, {
      debounceMs: 200,
      shouldPersistImmediately: () => false,
    });
    api.onChange("a");
    api.onChange("ab");
    expect(persist).not.toHaveBeenCalled();
    expect(clock.count()).toBe(1);
    clock.flushAll();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith("ab");
  });

  it("flush writes pending immediately", () => {
    const persist = vi.fn();
    const clock = fakeTimers();
    const api = createComposerDraftPersistence(persist, clock.timers, {
      debounceMs: 200,
      shouldPersistImmediately: () => false,
    });
    api.onChange("pending");
    api.flush();
    expect(persist).toHaveBeenCalledWith("pending");
    expect(clock.count()).toBe(0);
  });
});
