import type { WorkAttempt } from "@altai/host-contract";
import { describe, expect, it } from "vitest";
import {
  latestBoundAttempt,
  primaryWorkActions,
} from "../../src/webview/workAttemptUi.js";

const RUNNING: WorkAttempt = {
  id: "attempt-2",
  workId: "work-1",
  number: 2,
  role: "executor",
  phase: "running",
  chatId: "chat-2",
  sessionId: "chat-2",
  runId: "run-2",
  createdAtMs: 2,
  updatedAtMs: 3,
};

describe("Work Attempt UI decisions", () => {
  it("keeps backlog on Ready and uses bound Start only from ready", () => {
    expect(
      primaryWorkActions("backlog", [], {
        attemptRunsAvailable: true,
        replayAvailable: true,
      }),
    ).toEqual(["ready"]);
    expect(
      primaryWorkActions("ready", [], {
        attemptRunsAvailable: true,
        replayAvailable: true,
      }),
    ).toEqual(["start"]);
    expect(
      primaryWorkActions("ready", [], {
        attemptRunsAvailable: false,
        replayAvailable: true,
      }),
    ).toEqual([]);
  });

  it("never exposes a competing Start when an active Attempt exists", () => {
    expect(
      primaryWorkActions("ready", [RUNNING], {
        attemptRunsAvailable: true,
        replayAvailable: true,
      }),
    ).toEqual(["open_run"]);
    expect(
      primaryWorkActions("ready", [{ ...RUNNING, runId: null }], {
        attemptRunsAvailable: true,
        replayAvailable: true,
      }),
    ).toEqual([]);
  });

  it("gates Open run on exact replay and picks newest bound history", () => {
    expect(
      primaryWorkActions("in_progress", [RUNNING], {
        attemptRunsAvailable: true,
        replayAvailable: false,
      }),
    ).toEqual([]);
    expect(
      primaryWorkActions("in_progress", [RUNNING], {
        attemptRunsAvailable: false,
        replayAvailable: true,
      }),
    ).toEqual([]);
    expect(
      latestBoundAttempt([
        { ...RUNNING, id: "attempt-3", number: 3, runId: null },
        RUNNING,
      ]),
    ).toEqual(RUNNING);
  });
});
