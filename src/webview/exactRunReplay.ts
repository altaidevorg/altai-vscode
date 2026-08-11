import type { AgentEvent, ReplayPage } from "@altai/host-contract";
import {
  applyAgentEventToMessages,
  type ChatDisplayMessage,
} from "./chatDisplayMessage.js";

export type ExactRunSnapshot = {
  chatId: string;
  runId: string;
  lastSeq: number;
  terminal: boolean;
  terminalLabel: string | null;
  messages: ChatDisplayMessage[];
};

export type ReplayRun = (input: {
  chatId: string;
  runId: string;
  afterSeq?: number;
  limit?: number;
}) => Promise<ReplayPage>;

export type ExactRunReplayRequest = {
  generation: number;
  chatId: string;
  runId: string;
};

const REPLAY_PAGE_SIZE = 200;
const MAX_REPLAY_PAGES = 500;

/**
 * Extend an isolated inspector snapshot from the exact persisted run. This
 * never writes to the active Chat registry and therefore cannot make a
 * historical run steerable/cancellable by accident.
 */
export async function replayExactRun(
  replayRun: ReplayRun,
  chatId: string,
  runId: string,
  current: ExactRunSnapshot | null = null,
): Promise<ExactRunSnapshot> {
  if (!chatId.trim() || !runId.trim()) {
    throw new Error("invalid_exact_run_identity");
  }
  if (
    current &&
    (current.chatId !== chatId || current.runId !== runId)
  ) {
    throw new Error("exact_run_snapshot_identity_mismatch");
  }
  if (current?.terminal) return current;

  let snapshot =
    current ?? {
      chatId,
      runId,
      lastSeq: 0,
      terminal: false,
      terminalLabel: null,
      messages: [],
    };
  let exhausted = false;

  for (let pageCount = 0; pageCount < MAX_REPLAY_PAGES; pageCount += 1) {
    const page = await replayRun({
      chatId,
      runId,
      afterSeq: snapshot.lastSeq,
      limit: REPLAY_PAGE_SIZE,
    });
    if (page.events.length === 0) {
      exhausted = true;
      break;
    }

    for (const event of page.events) {
      snapshot = appendExactRunEvent(snapshot, event);
    }
    if (page.exhausted || page.events.length < REPLAY_PAGE_SIZE) {
      exhausted = true;
      break;
    }
  }

  if (!exhausted) {
    throw new Error("exact_run_replay_page_limit_exceeded");
  }
  if (snapshot.lastSeq === 0) {
    throw new Error(`Persisted run ${runId} was not found for chat ${chatId}.`);
  }
  return snapshot;
}

export function canCommitExactRunReplay(
  request: ExactRunReplayRequest,
  currentGeneration: number,
  current: { chatId: string; runId: string } | null,
): boolean {
  return (
    request.generation === currentGeneration &&
    current?.chatId === request.chatId &&
    current.runId === request.runId
  );
}

export function appendExactRunEvent(
  snapshot: ExactRunSnapshot,
  event: AgentEvent,
): ExactRunSnapshot {
  if (event.chatId !== snapshot.chatId || event.runId !== snapshot.runId) {
    throw new Error("exact_run_replay_identity_mismatch");
  }
  if (!Number.isSafeInteger(event.seq) || event.seq <= 0) {
    throw new Error("invalid_exact_run_sequence");
  }
  if (event.seq <= snapshot.lastSeq) return snapshot;
  if (event.seq !== snapshot.lastSeq + 1) {
    throw new Error("exact_run_replay_sequence_gap");
  }

  const terminalLabel = terminalLabelFromEvent(event);
  return {
    ...snapshot,
    lastSeq: event.seq,
    terminal: snapshot.terminal || terminalLabel !== null,
    terminalLabel: terminalLabel ?? snapshot.terminalLabel,
    messages: applyAgentEventToMessages(snapshot.messages, event, {
      activeChatId: snapshot.chatId,
    }),
  };
}

function terminalLabelFromEvent(event: AgentEvent): string | null {
  if (event.type !== "lifecycle") return null;
  const body = isRecord(event.payload) ? event.payload : {};
  const nested = isRecord(body.event) ? body.event : {};
  const kind =
    (typeof body.type === "string" && body.type) ||
    (typeof nested.type === "string" && nested.type) ||
    "";
  if (kind === "run_cancelled") return "cancelled";
  if (kind !== "run_terminated" && body.outcome === undefined) return null;
  const outcome = body.outcome;
  if (typeof outcome === "string" && outcome.trim()) return outcome.trim();
  if (isRecord(outcome) && typeof outcome.kind === "string") {
    return outcome.kind;
  }
  return "completed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
