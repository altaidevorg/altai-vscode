import { describe, expect, it } from "vitest";
import { parsePersistedWebviewState } from "../../src/shared/webviewState.js";

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

  it("drops malformed hostStatus", () => {
    expect(
      parsePersistedWebviewState({
        hostStatus: { status: "disconnected" },
      }),
    ).toEqual({});
  });
});
