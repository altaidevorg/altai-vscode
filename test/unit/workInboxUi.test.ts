import { describe, expect, it, vi } from "vitest";
import {
  loadWorkInboxRows,
  toWorkInboxRow,
} from "../../src/webview/workInboxUi.js";

const ITEM = {
  id: "failed_attempt:work-1:attempt-1",
  workId: "work-1",
  kind: "failed_attempt" as const,
  title: "Fix the build",
  why: "Attempt failed",
  createdAtMs: 1_700_000_000_000,
  attemptId: "attempt-1",
  chatId: "chat-1",
  runId: "run-1",
};

describe("Work Inbox UI mapping", () => {
  it("derives presentation age without changing canonical identity", () => {
    expect(toWorkInboxRow(ITEM, ITEM.createdAtMs + 120_000)).toEqual({
      id: ITEM.id,
      workId: "work-1",
      kind: "failed_attempt",
      title: "Fix the build",
      why: "Attempt failed",
      ageLabel: "2m ago",
    });
  });

  it("loads rows only through the canonical Inbox port", async () => {
    const listWorkInbox = vi.fn(async () => [ITEM]);
    await expect(
      loadWorkInboxRows(
        { listWorkInbox },
        ITEM.createdAtMs + 60_000,
      ),
    ).resolves.toEqual([
      expect.objectContaining({ workId: "work-1", ageLabel: "1m ago" }),
    ]);
    expect(listWorkInbox).toHaveBeenCalledOnce();
  });

  it("propagates host errors for the screen retry state", async () => {
    const listWorkInbox = vi.fn(async () => {
      throw new Error("inbox_unavailable");
    });
    await expect(loadWorkInboxRows({ listWorkInbox })).rejects.toThrow(
      "inbox_unavailable",
    );
  });

});
