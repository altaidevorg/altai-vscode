import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { HostManager } from "../../src/extension/host/HostManager.js";
import { encodeFrame, FrameDecoder } from "../../src/extension/rpc/frameCodec.js";

describe("HostManager.request", () => {
  it("proxies JSON-RPC and emits notifications while ready", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const decoder = new FrameDecoder();
    const requests: Array<Record<string, unknown>> = [];
    stdin.on("data", (chunk: Buffer) => {
      for (const frame of decoder.push(chunk)) {
        requests.push(JSON.parse(frame.toString("utf8")) as Record<string, unknown>);
      }
    });

    const manager = new HostManager({
      extensionPath: "/tmp/altai-ext",
      getWorkspaceRoot: () => "/tmp/ws",
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      env: {
        ALTAI_AGENT_HOST_PATH: process.execPath,
      },
      processFactory: () => ({
        stdin,
        stdout,
        stderr: new PassThrough(),
        pid: 42,
        kill: () => true,
        onExit: () => () => {},
      }),
    });

    const notifications: Array<{ method: string; params?: unknown }> = [];
    manager.on("notification", (n) => notifications.push(n));

    const startPromise = manager.start();
    await waitFor(() => requests.some((r) => r.method === "initialize"));
    const initReq = requests.find((r) => r.method === "initialize");
    stdout.write(
      encodeFrame(
        Buffer.from(
          JSON.stringify({
            jsonrpc: "2.0",
            id: initReq?.id,
            result: {
              protocol_min: 1,
              protocol_max: 1,
              capabilities: ["sessions/create", "run/start"],
            },
          }),
        ),
      ),
    );
    await startPromise;
    expect(manager.getLifecycleState()).toBe("Ready");

    const requestPromise = manager.request("sessions/list", { limit: 10 });
    await waitFor(() => requests.some((r) => r.method === "sessions/list"));
    const listReq = requests.find((r) => r.method === "sessions/list");
    stdout.write(
      encodeFrame(
        Buffer.from(
          JSON.stringify({
            jsonrpc: "2.0",
            id: listReq?.id,
            result: { sessions: [] },
          }),
        ),
      ),
    );
    await expect(requestPromise).resolves.toEqual({ sessions: [] });

    stdout.write(
      encodeFrame(
        Buffer.from(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "run/event",
            params: { chat_id: "c1", run_id: "r1", type: "lifecycle" },
          }),
        ),
      ),
    );
    await waitFor(() => notifications.length > 0);
    expect(notifications[0]?.method).toBe("run/event");

    manager.dispose();
  });

  it("rejects request when host is not ready", async () => {
    const manager = new HostManager({
      extensionPath: "/tmp/altai-ext",
      getWorkspaceRoot: () => undefined,
      isTrusted: () => true,
      extensionVersion: "0.1.0",
    });
    await expect(manager.request("sessions/list")).rejects.toThrow(
      /host_not_ready/,
    );
    manager.dispose();
  });
});

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
