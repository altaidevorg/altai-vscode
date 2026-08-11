import type { AgentEvent, ReplayPage } from "@altai/host-contract";
import { describe, expect, it, vi } from "vitest";
import {
  appendExactRunEvent,
  canCommitExactRunReplay,
  replayExactRun,
  type ExactRunSnapshot,
} from "../../src/webview/exactRunReplay.js";

function event(
  seq: number,
  overrides: Partial<AgentEvent> = {},
): AgentEvent {
  return {
    type: "message",
    chatId: "chat-1",
    runId: "run-1",
    seq,
    payload: { type: "agent_message", text: `message ${seq}` },
    ...overrides,
  };
}

function page(events: AgentEvent[]): ReplayPage {
  const last = events.at(-1);
  return {
    events,
    cursor: last
      ? { chatId: last.chatId, runId: last.runId, seq: last.seq }
      : null,
    exhausted: events.length === 0,
  };
}

describe("replayExactRun", () => {
  it("paginates by sequence and builds an isolated transcript", async () => {
    const first = Array.from({ length: 200 }, (_, index) => event(index + 1));
    const replay = vi
      .fn()
      .mockResolvedValueOnce(page(first))
      .mockResolvedValueOnce(page([event(201)]));

    const snapshot = await replayExactRun(replay, "chat-1", "run-1");

    expect(snapshot.lastSeq).toBe(201);
    expect(snapshot.messages.some((message) =>
      JSON.stringify(message).includes("message 201"),
    )).toBe(true);
    expect(replay).toHaveBeenNthCalledWith(1, {
      chatId: "chat-1",
      runId: "run-1",
      afterSeq: 0,
      limit: 200,
    });
    expect(replay).toHaveBeenNthCalledWith(2, {
      chatId: "chat-1",
      runId: "run-1",
      afterSeq: 200,
      limit: 200,
    });
  });

  it("extends a snapshot, ignores duplicate delivery, and records terminal state", async () => {
    const initial = appendExactRunEvent(emptySnapshot(), event(1));
    const terminal = event(2, {
      type: "lifecycle",
      payload: { type: "run_terminated", outcome: "success" },
    });
    const replay = vi.fn(async () => page([event(1), terminal]));

    const snapshot = await replayExactRun(
      replay,
      "chat-1",
      "run-1",
      initial,
    );

    expect(snapshot.lastSeq).toBe(2);
    expect(snapshot.terminal).toBe(true);
    expect(snapshot.terminalLabel).toBe("success");
  });

  it("fails closed on another run identity or a sequence gap", () => {
    expect(() =>
      appendExactRunEvent(
        emptySnapshot(),
        event(1, { runId: "run-other" }),
      ),
    ).toThrow("exact_run_replay_identity_mismatch");
    expect(() => appendExactRunEvent(emptySnapshot(), event(2))).toThrow(
      "exact_run_replay_sequence_gap",
    );
  });

  it("does not silently present a missing persisted run", async () => {
    await expect(
      replayExactRun(async () => page([]), "chat-1", "run-1"),
    ).rejects.toThrow("Persisted run run-1 was not found for chat chat-1.");
  });

  it("fences stale requests when another Attempt run opens", () => {
    const oldRequest = { generation: 4, chatId: "chat-1", runId: "run-1" };
    expect(
      canCommitExactRunReplay(oldRequest, 4, {
        chatId: "chat-1",
        runId: "run-1",
      }),
    ).toBe(true);
    expect(
      canCommitExactRunReplay(oldRequest, 5, {
        chatId: "chat-2",
        runId: "run-2",
      }),
    ).toBe(false);
  });

  it("does not replay or mutate an already terminal snapshot", async () => {
    const terminal = {
      ...emptySnapshot(),
      terminal: true,
      terminalLabel: "completed",
    };
    const replay = vi.fn();

    await expect(
      replayExactRun(replay, "chat-1", "run-1", terminal),
    ).resolves.toBe(terminal);
    expect(replay).not.toHaveBeenCalled();
  });
});

function emptySnapshot(): ExactRunSnapshot {
  return {
    chatId: "chat-1",
    runId: "run-1",
    lastSeq: 0,
    terminal: false,
    terminalLabel: null,
    messages: [],
  };
}
