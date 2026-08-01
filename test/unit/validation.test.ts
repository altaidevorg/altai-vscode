import { describe, expect, it } from "vitest";
import { WEBVIEW_PROTOCOL_VERSION } from "../../src/shared/messages.js";
import { parseWebviewMessage } from "../../src/shared/validation.js";

describe("parseWebviewMessage", () => {
  it("accepts a valid request", () => {
    const parsed = parseWebviewMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "request",
      id: "1",
      method: "host.getStatus",
    });
    expect(parsed).toEqual({
      protocolVersion: 1,
      type: "request",
      id: "1",
      method: "host.getStatus",
    });
  });

  it("rejects wrong protocol version", () => {
    expect(
      parseWebviewMessage({
        protocolVersion: 999,
        type: "request",
        id: "1",
        method: "host.getStatus",
      }),
    ).toBeNull();
  });

  it("rejects missing method on request", () => {
    expect(
      parseWebviewMessage({
        protocolVersion: WEBVIEW_PROTOCOL_VERSION,
        type: "request",
        id: "1",
      }),
    ).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parseWebviewMessage(null)).toBeNull();
    expect(parseWebviewMessage("x")).toBeNull();
    expect(parseWebviewMessage(1)).toBeNull();
  });

  it("rejects empty request ids", () => {
    expect(
      parseWebviewMessage({
        protocolVersion: WEBVIEW_PROTOCOL_VERSION,
        type: "request",
        id: "",
        method: "host.getStatus",
      }),
    ).toBeNull();
  });

  it("accepts a response with error body", () => {
    const parsed = parseWebviewMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "response",
      id: "1",
      error: { code: "timeout", message: "timed out" },
    });
    expect(parsed).toEqual({
      protocolVersion: 1,
      type: "response",
      id: "1",
      error: { code: "timeout", message: "timed out" },
    });
  });

  it("accepts a host status event", () => {
    const parsed = parseWebviewMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "event",
      id: "e1",
      event: "host.status",
      payload: {
        status: "disconnected",
        message: "ALTAI host not connected",
        extensionVersion: "0.1.0",
      },
    });
    expect(parsed?.type).toBe("event");
  });
});
