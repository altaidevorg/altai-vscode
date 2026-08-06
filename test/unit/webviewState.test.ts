import { describe, expect, it } from "vitest";
import {
  mergePersistedWebviewState,
  parsePersistedWebviewState,
} from "../../src/shared/webviewState.js";

describe("parsePersistedWebviewState", () => {
  it("returns empty object for non-objects", () => {
    expect(parsePersistedWebviewState(null)).toEqual({});
    expect(parsePersistedWebviewState("x")).toEqual({});
    expect(parsePersistedWebviewState(1)).toEqual({});
  });

  it("accepts a valid hostStatus snapshot", () => {
    expect(
      parsePersistedWebviewState({
        hostStatus: {
          status: "disconnected",
          message: "ALTAI host not connected",
          extensionVersion: "0.1.0",
        },
      }),
    ).toEqual({
      hostStatus: {
        status: "disconnected",
        message: "ALTAI host not connected",
        extensionVersion: "0.1.0",
      },
    });
  });

  it("drops malformed hostStatus without discarding other fields", () => {
    expect(
      parsePersistedWebviewState({
        hostStatus: { status: "disconnected" },
        surface: "operations",
        operationsView: "inbox",
        workHubView: "scheduled",
      }),
    ).toEqual({
      surface: "operations",
      operationsView: "inbox",
      workHubView: "scheduled",
    });
  });

  it("accepts surface and operations presentation fields", () => {
    expect(
      parsePersistedWebviewState({
        surface: "operations",
        operationsView: "work",
        workHubView: "runs",
        activeChatId: "chat-42",
      }),
    ).toEqual({
      surface: "operations",
      operationsView: "work",
      workHubView: "runs",
      activeChatId: "chat-42",
    });
  });

  it("drops empty activeChatId", () => {
    expect(parsePersistedWebviewState({ activeChatId: "" })).toEqual({});
  });

  it("drops unknown surface or operations routes", () => {
    expect(
      parsePersistedWebviewState({
        surface: "agents",
        operationsView: "agents",
        workHubView: "cron",
      }),
    ).toEqual({});
  });

  it("accepts settings surface", () => {
    expect(parsePersistedWebviewState({ surface: "settings" })).toEqual({
      surface: "settings",
    });
  });

  it("accepts capped composerDraft and drops empties/control chars", () => {
    expect(
      parsePersistedWebviewState({ composerDraft: "  draft text  " }),
    ).toEqual({ composerDraft: "  draft text  " });
    expect(parsePersistedWebviewState({ composerDraft: "" })).toEqual({});
    expect(
      parsePersistedWebviewState({ composerDraft: "bad\u0000text" }),
    ).toEqual({});
    const long = "x".repeat(9_000);
    expect(
      parsePersistedWebviewState({ composerDraft: long }).composerDraft,
    ).toHaveLength(8_000);
  });
});

describe("mergePersistedWebviewState", () => {
  it("preserves existing keys when patching one field", () => {
    expect(
      mergePersistedWebviewState(
        {
          surface: "operations",
          operationsView: "runs",
          hostStatus: {
            status: "ready",
            message: "ok",
            extensionVersion: "0.1.0",
          },
        },
        { operationsView: "inbox" },
      ),
    ).toEqual({
      surface: "operations",
      operationsView: "inbox",
      hostStatus: {
        status: "ready",
        message: "ok",
        extensionVersion: "0.1.0",
      },
    });
  });

  it("clears composerDraft when patch sets empty", () => {
    expect(
      mergePersistedWebviewState(
        { composerDraft: "hello", surface: "chat" },
        { composerDraft: "" },
      ),
    ).toEqual({ surface: "chat" });
  });

  it("clears activeChatId when patch sets empty", () => {
    expect(
      mergePersistedWebviewState(
        { activeChatId: "chat-1", surface: "chat" },
        { activeChatId: "" },
      ),
    ).toEqual({ surface: "chat" });
  });
});
