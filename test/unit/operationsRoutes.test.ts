import { describe, expect, it } from "vitest";
import {
  automationScheduleUiLabel,
  mapTaskRunUiStatus,
  resolveAvailableOperationsViews,
  taskRunIsActive,
} from "../../src/webview/operationsRoutes.js";

describe("resolveAvailableOperationsViews", () => {
  it("always includes overview and gates domain routes by capability", () => {
    expect(
      resolveAvailableOperationsViews({
        taskRuns: false,
        automations: false,
        inbox: false,
      }),
    ).toEqual(["overview"]);

    expect(
      resolveAvailableOperationsViews({
        taskRuns: true,
        automations: false,
        inbox: false,
      }),
    ).toEqual(["overview", "work", "runs"]);

    expect(
      resolveAvailableOperationsViews({
        taskRuns: false,
        automations: true,
        inbox: true,
      }),
    ).toEqual(["overview", "work", "inbox"]);

    expect(
      resolveAvailableOperationsViews({
        taskRuns: true,
        automations: true,
        inbox: true,
      }),
    ).toEqual(["overview", "work", "runs", "inbox"]);
  });
});

describe("mapTaskRunUiStatus", () => {
  it("maps host run statuses onto TaskRunCard statuses", () => {
    expect(mapTaskRunUiStatus("queued")).toBe("dispatching");
    expect(mapTaskRunUiStatus("running")).toBe("running");
    expect(mapTaskRunUiStatus("succeeded")).toBe("done");
    expect(mapTaskRunUiStatus("failed")).toBe("failed");
    expect(mapTaskRunUiStatus("cancelled")).toBe("cancelled");
  });

  it("flags active runs", () => {
    expect(taskRunIsActive("queued")).toBe(true);
    expect(taskRunIsActive("running")).toBe(true);
    expect(taskRunIsActive("succeeded")).toBe(false);
  });
});

describe("automationScheduleUiLabel", () => {
  it("formats one-shot and interval schedules", () => {
    expect(
      automationScheduleUiLabel({
        id: "a1",
        title: "Daily",
        enabled: true,
        schedule: { kind: "once", at: "2026-08-06T12:00:00.000Z" },
      }),
    ).toContain("Once");
    expect(
      automationScheduleUiLabel({
        id: "a2",
        title: "Hourly",
        enabled: true,
        schedule: { kind: "every", everyMs: 3_600_000 },
      }),
    ).toBe("Every 1h");
  });
});
