import type { WorkItem } from "@altai/host-contract";
import { describe, expect, it, vi } from "vitest";
import {
  executeWorkAction,
  WorkActionUnavailableError,
  type WorkOsPort,
} from "../../src/webview/workOsActions.js";

const DETAIL: WorkItem = {
  id: "work-1",
  projectId: "project-1",
  title: "Ship durable Work",
  description: "",
  acceptanceCriteria: "",
  state: "in_progress",
  revision: 4,
  createdAtMs: 1,
  updatedAtMs: 2,
};

function workPort(result: WorkItem = DETAIL): WorkOsPort {
  return {
    listWork: vi.fn(async () => [result]),
    getWork: vi.fn(async () => result),
    createWork: vi.fn(async () => result),
    transitionWork: vi.fn(async () => result),
    startWork: vi.fn(async () => result),
    markWorkReadyForReview: vi.fn(async () => result),
    reviewWork: vi.fn(async () => result),
  };
}

describe("executeWorkAction", () => {
  it("maps Ready and Start to WorkPort without inventing revisions", async () => {
    const port = workPort({ ...DETAIL, revision: 9 });

    await expect(executeWorkAction(port, DETAIL, "ready")).resolves.toMatchObject(
      { revision: 9 },
    );
    await executeWorkAction(port, DETAIL, "start");

    expect(port.transitionWork).toHaveBeenCalledWith({
      workId: "work-1",
      expectedRevision: 4,
      nextState: "ready",
    });
    expect(port.startWork).toHaveBeenCalledWith({
      workId: "work-1",
      expectedRevision: 4,
    });
  });

  it("rejects Open run without mutating durable Work", async () => {
    const port = workPort();

    await expect(executeWorkAction(port, DETAIL, "open_run")).rejects.toEqual(
      expect.objectContaining({
        name: "WorkActionUnavailableError",
        code: "run_binding_unavailable",
      }),
    );
    await expect(executeWorkAction(port, DETAIL, "open_run")).rejects.toThrow(
      WorkActionUnavailableError,
    );
    expect(port.markWorkReadyForReview).not.toHaveBeenCalled();
  });

  it("maps Accept and trimmed Return guidance without inventing revisions", async () => {
    const port = workPort();

    await executeWorkAction(port, DETAIL, "accept");
    await executeWorkAction(port, DETAIL, "return", "  Add evidence  ");

    expect(port.reviewWork).toHaveBeenNthCalledWith(1, {
      workId: "work-1",
      expectedRevision: 4,
      accept: true,
      guidance: "",
    });
    expect(port.reviewWork).toHaveBeenNthCalledWith(2, {
      workId: "work-1",
      expectedRevision: 4,
      accept: false,
      guidance: "Add evidence",
    });
  });

  it("does not Return without guidance", async () => {
    const port = workPort();

    await expect(
      executeWorkAction(port, DETAIL, "return", "   "),
    ).resolves.toBeNull();
    expect(port.reviewWork).not.toHaveBeenCalled();
  });
});
