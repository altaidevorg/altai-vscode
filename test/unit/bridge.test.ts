import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BridgeError,
  MessageBridge,
  createLinkedTransports,
} from "../../src/shared/bridge.js";
import { WEBVIEW_PROTOCOL_VERSION } from "../../src/shared/messages.js";

describe("MessageBridge", () => {
  const bridges: MessageBridge[] = [];

  afterEach(() => {
    for (const bridge of bridges.splice(0)) {
      bridge.dispose();
    }
  });

  function pair(options?: {
    a?: ConstructorParameters<typeof MessageBridge>[1];
    b?: ConstructorParameters<typeof MessageBridge>[1];
  }): [MessageBridge, MessageBridge] {
    const [transportA, transportB] = createLinkedTransports();
    const a = new MessageBridge(transportA, options?.a);
    const b = new MessageBridge(transportB, options?.b);
    bridges.push(a, b);
    return [a, b];
  }

  it("round-trips a request/response", async () => {
    const [client, host] = pair();
    host.registerHandler("echo", (params) => {
      expect(params).toEqual({ value: 42 });
      return { echoed: 42 };
    });

    await expect(
      client.request("echo", { params: { value: 42 } }),
    ).resolves.toEqual({ echoed: 42 });
  });

  it("delivers events to matching listeners", () => {
    const [client, host] = pair();
    const payloads: unknown[] = [];
    client.onEvent("host.status", (payload) => {
      payloads.push(payload);
    });

    host.postEvent("host.status", { status: "ready" });
    expect(payloads).toEqual([{ status: "ready" }]);
  });

  it("times out when no response arrives", async () => {
    const sink = {
      postMessage: () => {
        /* swallow */
      },
      subscribe: () => () => {
        /* no-op */
      },
    };
    const lonely = new MessageBridge(sink, { defaultTimeoutMs: 25 });
    bridges.push(lonely);

    await expect(lonely.request("never.answers")).rejects.toMatchObject({
      code: "timeout",
      name: "BridgeError",
    });
  });

  it("does not reject with timeout after a late response is already settled", async () => {
    vi.useFakeTimers();
    try {
      const [client, host] = pair({
        a: { defaultTimeoutMs: 50 },
      });
      host.registerHandler("slow", async () => {
        await vi.advanceTimersByTimeAsync(40);
        return "ok";
      });

      const pending = client.request("slow");
      await vi.advanceTimersByTimeAsync(40);
      await expect(pending).resolves.toBe("ok");

      // Fire any remaining timeout timers; settle must ignore them.
      await vi.advanceTimersByTimeAsync(100);
      await expect(pending).resolves.toBe("ok");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not invoke handlers for invalid messages", () => {
    const handler = vi.fn();
    const onInvalidMessage = vi.fn();
    const [rawA, rawB] = createLinkedTransports();
    const host = new MessageBridge(rawB, { onInvalidMessage });
    bridges.push(host);
    host.registerHandler("secure.method", handler);

    rawA.postMessage({ not: "a valid envelope" });
    rawA.postMessage(null);
    rawA.postMessage({
      protocolVersion: 999,
      type: "request",
      id: "x",
      method: "secure.method",
    });
    rawA.postMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "request",
      id: "",
      method: "secure.method",
    });

    expect(handler).not.toHaveBeenCalled();
    expect(onInvalidMessage).toHaveBeenCalledTimes(4);
  });

  it("rejects pending requests on dispose", async () => {
    const sink = {
      postMessage: () => {
        /* swallow */
      },
      subscribe: () => () => {
        /* no-op */
      },
    };
    const bridge = new MessageBridge(sink, { defaultTimeoutMs: 60_000 });
    const pending = bridge.request("slow");
    bridge.dispose();

    await expect(pending).rejects.toBeInstanceOf(BridgeError);
    await expect(pending).rejects.toMatchObject({ code: "disposed" });
  });

  it("returns method_not_found for unknown requests", async () => {
    const [client] = pair();

    await expect(client.request("missing.method")).rejects.toMatchObject({
      code: "method_not_found",
    });
  });

  it("surfaces handler errors as bridge errors", async () => {
    const [client, host] = pair();
    host.registerHandler("boom", () => {
      throw new Error("exploded");
    });

    await expect(client.request("boom")).rejects.toMatchObject({
      code: "handler_error",
      message: "exploded",
    });
  });

  it("reports unknown events without throwing", () => {
    const onUnknownEvent = vi.fn();
    const [, host] = pair({
      a: { onUnknownEvent },
    });

    expect(() => host.postEvent("no.listeners", { ok: true })).not.toThrow();
    expect(onUnknownEvent).toHaveBeenCalledWith(
      "no.listeners",
      expect.any(String),
    );
  });

  it("uses deterministic ids when createId is injected", async () => {
    let n = 0;
    const [client, host] = pair({
      a: { createId: () => `id-${++n}` },
    });
    host.registerHandler("ping", () => "pong");

    await expect(client.request("ping")).resolves.toBe("pong");
  });

  it("delivers host.request params as { method, params } (bridge options.params)", async () => {
    const [client, host] = pair();
    const seen: unknown[] = [];
    host.registerHandler("host.request", (params) => {
      seen.push(params);
      return { ok: true };
    });

    // Same shape AltaiApp transport uses: options.params is the RPC payload.
    await client.request("host.request", {
      params: { method: "sessions/list", params: { limit: 10 } },
    });
    await client.request("host.request", {
      params: { method: "models/list" },
    });

    expect(seen).toEqual([
      { method: "sessions/list", params: { limit: 10 } },
      { method: "models/list" },
    ]);
  });
});
