import { describe, expect, it, vi } from "vitest";
import {
  fetchOperationsAttentionCount,
  shouldRefreshAttentionOnEvent,
} from "../../src/webview/operationsAttentionPoll.js";

describe("fetchOperationsAttentionCount", () => {
  it("returns 0 without transport when capabilities are off", async () => {
    const listTaskRuns = vi.fn();
    const listNotifications = vi.fn();
    await expect(
      fetchOperationsAttentionCount(
        { taskRuns: false, inbox: false },
        { listTaskRuns, listNotifications },
      ),
    ).resolves.toBe(0);
    expect(listTaskRuns).not.toHaveBeenCalled();
    expect(listNotifications).not.toHaveBeenCalled();
  });

  it("counts failed runs and unseen notifications", async () => {
    const count = await fetchOperationsAttentionCount(
      { taskRuns: true, inbox: true },
      {
        listTaskRuns: async () => [
          {
            id: "a",
            title: "A",
            status: "failed",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
          {
            id: "b",
            title: "B",
            status: "running",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        listNotifications: async () => [
          {
            id: "n1",
            title: "Unread",
            seen: false,
            createdAt: "2024-01-01T00:00:00.000Z",
          },
          {
            id: "n2",
            title: "Read",
            seen: true,
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      },
    );
    expect(count).toBe(2);
  });

  it("skips the slice that is not capable", async () => {
    const listTaskRuns = vi.fn(async () => [
      {
        id: "a",
        title: "A",
        status: "failed" as const,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ]);
    const listNotifications = vi.fn(async () => [
      {
        id: "n1",
        title: "Unread",
        seen: false,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ]);
    await expect(
      fetchOperationsAttentionCount(
        { taskRuns: true, inbox: false },
        { listTaskRuns, listNotifications },
      ),
    ).resolves.toBe(1);
    expect(listNotifications).not.toHaveBeenCalled();
  });
});

describe("shouldRefreshAttentionOnEvent", () => {
  it("refreshes on lifecycle and notification only", () => {
    expect(shouldRefreshAttentionOnEvent("lifecycle")).toBe(true);
    expect(shouldRefreshAttentionOnEvent("notification")).toBe(true);
    expect(shouldRefreshAttentionOnEvent("token")).toBe(false);
  });
});
