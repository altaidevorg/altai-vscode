import { describe, expect, it } from "vitest";
import {
  buildOpenOperationsPayload,
  parseOpenOperationsPayload,
} from "../../src/shared/operationsDeepLink.js";
import {
  resolveDeepLinkOperationsView,
  resolveDeepLinkWorkHubView,
} from "../../src/webview/operationsDeepLink.js";

describe("parseOpenOperationsPayload", () => {
  it("accepts valid deep-link envelopes", () => {
    expect(
      parseOpenOperationsPayload({
        key: 42,
        view: "inbox",
        workHubView: "scheduled",
      }),
    ).toEqual({
      key: 42,
      view: "inbox",
      workHubView: "scheduled",
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseOpenOperationsPayload(null)).toBeNull();
    expect(parseOpenOperationsPayload({ key: 1, view: "agents" })).toBeNull();
    expect(parseOpenOperationsPayload({ key: "x", view: "work" })).toBeNull();
    expect(
      parseOpenOperationsPayload({
        key: 1,
        view: "work",
        workHubView: "cron",
      }),
    ).toBeNull();
  });
});

describe("buildOpenOperationsPayload", () => {
  it("defaults to overview and stamps a key", () => {
    const payload = buildOpenOperationsPayload({});
    expect(payload.view).toBe("overview");
    expect(typeof payload.key).toBe("number");
  });
});

describe("resolveDeepLinkOperationsView", () => {
  it("falls back to overview when the target is not available", () => {
    expect(
      resolveDeepLinkOperationsView("inbox", {
        taskRuns: true,
        automations: false,
        inbox: false,
      }),
    ).toBe("overview");
    expect(
      resolveDeepLinkOperationsView("runs", {
        taskRuns: true,
        automations: false,
        inbox: false,
      }),
    ).toBe("runs");
  });
});

describe("resolveDeepLinkWorkHubView", () => {
  it("prefers scheduled only when automations capacity exists", () => {
    expect(
      resolveDeepLinkWorkHubView("scheduled", {
        taskRuns: true,
        automations: true,
        inbox: false,
      }),
    ).toBe("scheduled");
    expect(
      resolveDeepLinkWorkHubView("scheduled", {
        taskRuns: true,
        automations: false,
        inbox: false,
      }),
    ).toBe("runs");
  });
});
