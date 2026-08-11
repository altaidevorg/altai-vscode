import { describe, expect, it } from "vitest";
import {
  canCommitWorkDetailRequest,
  createCoalescedAsyncGate,
  shouldRequestWorkInboxRefresh,
  WORK_INBOX_POLL_INTERVAL_MS,
} from "../../src/webview/workOsRefresh.js";

describe("Work Inbox refresh policy", () => {
  it("coalesces overlapping triggers into one bounded trailing refresh", async () => {
    let releaseFirst: (() => void) | undefined;
    let active = 0;
    let maxActive = 0;
    let runs = 0;
    const gate = createCoalescedAsyncGate(async () => {
      runs += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (runs === 1) {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      active -= 1;
    });

    const first = gate.request();
    const second = gate.request();
    const third = gate.request();
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(runs).toBe(1);
    releaseFirst?.();
    await first;
    expect(runs).toBe(2);
    expect(maxActive).toBe(1);
  });

  it("can discard a queued trailing refresh during cleanup", async () => {
    let release: (() => void) | undefined;
    let runs = 0;
    const gate = createCoalescedAsyncGate(async () => {
      runs += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const active = gate.request();
    void gate.request();
    gate.cancelPending();
    release?.();
    await active;
    expect(runs).toBe(1);
  });

  it("refreshes on entry into Inbox but not unrelated surface renders", () => {
    expect(
      shouldRequestWorkInboxRefresh("surface", {
        previousSurface: "work",
        surface: "inbox",
      }),
    ).toBe(true);
    expect(
      shouldRequestWorkInboxRefresh("surface", {
        previousSurface: "inbox",
        surface: "inbox",
      }),
    ).toBe(false);
    expect(
      shouldRequestWorkInboxRefresh("surface", {
        previousSurface: "inbox",
        surface: "work",
      }),
    ).toBe(false);
  });

  it("uses the Desktop-aligned poll interval and pauses hidden polling", () => {
    expect(WORK_INBOX_POLL_INTERVAL_MS).toBe(5_000);
    expect(
      shouldRequestWorkInboxRefresh("poll", { visibilityState: "visible" }),
    ).toBe(true);
    expect(
      shouldRequestWorkInboxRefresh("poll", { visibilityState: "hidden" }),
    ).toBe(false);
    expect(
      shouldRequestWorkInboxRefresh("visibility", {
        visibilityState: "visible",
      }),
    ).toBe(true);
    expect(
      shouldRequestWorkInboxRefresh("visibility", {
        visibilityState: "hidden",
      }),
    ).toBe(false);
  });
});

describe("Work detail request identity", () => {
  it("rejects stale generations and results for another selected Work", () => {
    const request = { generation: 4, workId: "work-1" };
    expect(canCommitWorkDetailRequest(request, 4, "work-1")).toBe(true);
    expect(canCommitWorkDetailRequest(request, 5, "work-1")).toBe(false);
    expect(canCommitWorkDetailRequest(request, 4, "work-2")).toBe(false);
    expect(canCommitWorkDetailRequest(request, 4, null)).toBe(false);
  });
});
