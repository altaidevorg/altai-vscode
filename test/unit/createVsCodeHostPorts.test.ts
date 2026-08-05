import { describe, expect, it, vi } from "vitest";
import { createVsCodeHostPorts } from "../../src/webview/host/createVsCodeHostPorts.js";

function mockTransport(requestImpl?: (method: string, params?: unknown) => Promise<unknown>) {
  return {
    request: vi.fn(
      requestImpl ??
        (async () => {
          throw new Error("unexpected");
        }),
    ),
    requestWorkspace: vi.fn(async () => {
      throw new Error("unexpected workspace request");
    }),
    onNotification: vi.fn(() => () => {}),
  };
}

describe("createVsCodeHostPorts", () => {
  it("defers chat capabilities while the host is not ready", async () => {
    const ports = createVsCodeHostPorts({
      hostVersion: "0.1.0",
      isHostReady: () => false,
      transport: mockTransport(),
    });
    const caps = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    expect(caps.hostName).toBe("altai-vscode");
    const byId = Object.fromEntries(
      caps.capabilities.map((c) => [c.id, c.availability]),
    );
    expect(byId["runtime.initialize"]).toBe("available");
    expect(byId["runtime.startRun"]).toBe("deferred");
    expect(byId["sessions.list"]).toBe("deferred");
  });

  it("enables chat capabilities and proxies startRun when ready", async () => {
    const transport = mockTransport(async (method, params) => {
      if (method === "sessions/create") {
        return { chat_id: (params as { chat_id: string }).chat_id };
      }
      if (method === "run/start") {
        return { run_id: "run_1" };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      hostVersion: "0.1.0",
      isHostReady: () => true,
      transport,
    });
    const caps = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    const byId = Object.fromEntries(
      caps.capabilities.map((c) => [c.id, c.availability]),
    );
    expect(byId["runtime.startRun"]).toBe("available");
    expect(byId["sessions.create"]).toBe("available");

    const ref = await ports.runtime.startRun({ prompt: "hello" });
    expect(ref.runId).toBe("run_1");
    expect(ref.chatId).toMatch(/^chat_/);
    expect(transport.request).toHaveBeenCalledWith(
      "sessions/create",
      expect.objectContaining({ chat_id: ref.chatId }),
    );
    expect(transport.request).toHaveBeenCalledWith(
      "run/start",
      expect.objectContaining({ chat_id: ref.chatId, prompt: "hello" }),
    );
  });

  it("enables and routes supported VS Code workspace ports only when ready", async () => {
    const transport = mockTransport();
    transport.request.mockImplementation(async (method) => {
      if (method === "checkpoints/list") {
        return {
          checkpoints: [
            { id: "checkpoint_1", label: "Before edit", created_ms: 1_700_000_000_000 },
          ],
        };
      }
      if (method === "checkpoints/restore") {
        return { restored: true };
      }
      if (method === "config/get") {
        return { model: "auto" };
      }
      if (method === "config/update") {
        return { model: "openai/gpt-test" };
      }
      if (method === "context/compact") {
        return { accepted: true };
      }
      throw new Error(`unexpected native method ${method}`);
    });
    transport.requestWorkspace.mockImplementation(async (method, _params) => {
      if (method === "getActiveFile") {
        return { uri: "file:///workspace/a.ts", path: "/workspace/a.ts" };
      }
      if (method === "searchFiles") {
        return [{ uri: "file:///workspace/a.ts", path: "/workspace/a.ts" }];
      }
      if (method === "getGitDiff") {
        return { branch: "main", files: [] };
      }
      throw new Error(`unexpected workspace method ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      transport,
    });
    const caps = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    const byId = Object.fromEntries(
      caps.capabilities.map((capability) => [capability.id, capability.availability]),
    );
    expect(byId["workspace.activeFile"]).toBe("available");
    expect(byId["workspace.openDiff"]).toBe("available");
    expect(byId["workspace.gitDiff"]).toBe("available");
    expect(byId["review.checkpoints"]).toBe("available");
    expect(byId["settings.update"]).toBe("available");
    expect(byId["runtime.compactContext"]).toBe("available");
    await expect(ports.workspace.getActiveFile()).resolves.toMatchObject({
      path: "/workspace/a.ts",
    });
    await expect(ports.workspace.searchFiles("a.ts")).resolves.toHaveLength(1);
    await expect(ports.workspace.getGitDiff()).resolves.toEqual({
      branch: "main",
      files: [],
    });
    await expect(ports.review.listCheckpoints("chat_1")).resolves.toEqual([
      {
        id: "checkpoint_1",
        chatId: "chat_1",
        label: "Before edit",
        createdAt: "2023-11-14T22:13:20.000Z",
      },
    ]);
    await ports.review.restoreCheckpoint("checkpoint_1");
    expect(transport.request).toHaveBeenCalledWith("checkpoints/restore", {
      id: "checkpoint_1",
    });
    await expect(
      ports.settings.updateSettings({ defaultModelId: "openai/gpt-test" }),
    ).resolves.toMatchObject({ defaultModelId: "openai/gpt-test" });
    expect(transport.request).toHaveBeenCalledWith("config/update", {
      model: "openai/gpt-test",
    });
    await ports.runtime.compactContext({ chatId: "chat_1" });
    expect(transport.request).toHaveBeenCalledWith("context/compact", {
      chat_id: "chat_1",
    });
    expect(transport.requestWorkspace).toHaveBeenCalledWith("searchFiles", {
      query: "a.ts",
    });
  });

  it("rejects startRun while host is not ready", async () => {
    const ports = createVsCodeHostPorts({
      isHostReady: () => false,
      transport: mockTransport(),
    });
    await expect(
      ports.runtime.startRun({
        prompt: "hello",
      }),
    ).rejects.toThrow(/host_not_ready/);
  });

  it("defers native controls the host did not advertise", async () => {
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => ["run/start", "sessions/create"],
      transport: mockTransport(),
    });
    const caps = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    const byId = Object.fromEntries(
      caps.capabilities.map((capability) => [capability.id, capability.availability]),
    );
    expect(byId["runtime.startRun"]).toBe("available");
    expect(byId["runtime.compactContext"]).toBe("deferred");
    expect(byId["settings.update"]).toBe("deferred");
  });
});
