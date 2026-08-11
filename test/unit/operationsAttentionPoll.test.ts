import { describe, expect, it, vi } from "vitest";
import {
  fetchOperationsAttentionCount,
  shouldRefreshAttentionOnEvent,
} from "../../src/webview/operationsAttentionPoll.js";

describe("fetchOperationsAttentionCount", () => {
  it("returns 0 without transport when capabilities are off", async () => {
    const listWorkInbox = vi.fn();
    await expect(
      fetchOperationsAttentionCount(
        false,
        { listWorkInbox },
      ),
    ).resolves.toBe(0);
    expect(listWorkInbox).not.toHaveBeenCalled();
  });

  it("counts only actionable canonical Work Inbox rows", async () => {
    const count = await fetchOperationsAttentionCount(
      true,
      {
        listWorkInbox: async () => [
          {
            id: "review_required:work-1:attempt-1",
            workId: "work-1",
            kind: "review_required",
            title: "Review Work",
            why: "Attempt finished — decide Accept or Return",
            createdAtMs: 1,
          },
          {
            id: "blocked:work-2",
            workId: "work-2",
            kind: "blocked",
            title: "Blocked Work",
            why: "Blocked: permission required",
            createdAtMs: 2,
          },
        ],
      },
    );
    expect(count).toBe(2);
  });

  it("propagates query errors so owners can preserve the last-known badge", async () => {
    await expect(
      fetchOperationsAttentionCount(true, {
        listWorkInbox: async () => {
          throw new Error("work_inbox_unavailable");
        },
      }),
    ).rejects.toThrow("work_inbox_unavailable");
  });
});

describe("shouldRefreshAttentionOnEvent", () => {
  it("refreshes on lifecycle and notification only", () => {
    expect(shouldRefreshAttentionOnEvent("lifecycle")).toBe(true);
    expect(shouldRefreshAttentionOnEvent("notification")).toBe(true);
    expect(shouldRefreshAttentionOnEvent("token")).toBe(false);
  });
});
