import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { encodeFrame, FrameError } from "../../src/extension/rpc/frameCodec.js";
import { RpcClient } from "../../src/extension/rpc/RpcClient.js";
import { CapabilityStore } from "../../src/extension/rpc/capabilityStore.js";

function duplex(): { clientIn: PassThrough; clientOut: PassThrough } {
  return {
    clientIn: new PassThrough(),
    clientOut: new PassThrough(),
  };
}

describe("RpcClient", () => {
  it("matches request and response by id", async () => {
    const { clientIn, clientOut } = duplex();
    const client = new RpcClient(clientIn, clientOut);

    const pending = client.request("initialize", {
      protocol_min: 1,
      protocol_max: 1,
    });

    const written = await new Promise<Buffer>((resolve) => {
      clientIn.once("data", (chunk: Buffer) => resolve(chunk));
    });
    expect(written.toString("utf8")).toContain('"method":"initialize"');

    const response = encodeFrame(
      Buffer.from(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { protocol_min: 1, protocol_max: 1, capabilities: ["x"] },
        }),
        "utf8",
      ),
    );
    clientOut.write(response);
    await expect(pending).resolves.toEqual({
      protocol_min: 1,
      protocol_max: 1,
      capabilities: ["x"],
    });
    client.dispose();
  });

  it("delivers notifications", async () => {
    const { clientIn, clientOut } = duplex();
    const onNotification = vi.fn();
    const client = new RpcClient(clientIn, clientOut, { onNotification });

    clientOut.write(
      encodeFrame(
        Buffer.from(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "event.progress",
            params: { n: 1 },
          }),
          "utf8",
        ),
      ),
    );

    await vi.waitFor(() => {
      expect(onNotification).toHaveBeenCalledWith({
        method: "event.progress",
        params: { n: 1 },
      });
    });
    client.dispose();
  });

  it("rejects pending requests on dispose", async () => {
    const { clientIn, clientOut } = duplex();
    const client = new RpcClient(clientIn, clientOut);
    const pending = client.request("ping");
    client.dispose("gone");
    await expect(pending).rejects.toThrow("gone");
  });

  it("fails distinctly on bad frames", async () => {
    const { clientIn, clientOut } = duplex();
    const onFrameError = vi.fn();
    const client = new RpcClient(clientIn, clientOut, { onFrameError });
    const pending = client.request("ping");

    clientOut.write(Buffer.from("Not-Length: 1\r\n\r\nx", "utf8"));

    await expect(pending).rejects.toThrow(/frame_error/);
    expect(onFrameError).toHaveBeenCalled();
    const err = onFrameError.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(FrameError);
    expect((err as FrameError).code).toBe("missing_content_length");
  });
});

describe("CapabilityStore", () => {
  it("stores initialize capabilities", () => {
    const store = new CapabilityStore();
    store.setFromInitialize({
      protocol_min: 1,
      protocol_max: 1,
      capabilities: ["stdio.serve", 2, "sessions.create"],
    });
    expect(store.list()).toEqual(["stdio.serve", "sessions.create"]);
    expect(store.has("stdio.serve")).toBe(true);
    expect(store.protocolRange()).toEqual({ min: 1, max: 1 });
  });
});
