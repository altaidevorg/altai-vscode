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
  it("proxies the complete native MCP lifecycle only when advertised", async () => {
    const transport = mockTransport(async (method) => {
      if (method === "mcp/servers/list") {
        return { servers: [{ id: "files", name: "Files", enabled: true, connected: true }] };
      }
      if (method === "mcp/servers/configure") {
        return { id: "files", name: "Files", enabled: true, connected: false };
      }
      if (method === "mcp/servers/enable" || method === "mcp/servers/restart") {
        return { ok: true };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [
        "mcp/servers/list",
        "mcp/servers/configure",
        "mcp/servers/enable",
        "mcp/servers/restart",
      ],
      transport,
    });
    await expect(ports.mcpSkills.listMcpServers()).resolves.toEqual([
      { id: "files", name: "Files", enabled: true, connected: true },
    ]);
    await ports.mcpSkills.configureMcpServer("files", {
      name: "Files",
      command: "node",
      args: ["server.js"],
      enabled: true,
    });
    await ports.mcpSkills.setMcpServerEnabled("files", false);
    await ports.mcpSkills.restartMcpServer("files");
    expect(transport.request).toHaveBeenCalledWith("mcp/servers/configure", {
      id: "files",
      config: { name: "Files", command: "node", args: ["server.js"], enabled: true },
    });
    expect(transport.request).toHaveBeenCalledWith("mcp/servers/enable", { id: "files", enabled: false });
    expect(transport.request).toHaveBeenCalledWith("mcp/servers/restart", { id: "files" });
  });

  it("enables Work task runs only with the complete native lifecycle and proxies each action", async () => {
    let taskId = "";
    const transport = mockTransport(async (method, params) => {
      if (method === "work/tasks/create") {
        taskId = (params as { chat_id: string }).chat_id;
        return { accepted: true, task_id: taskId };
      }
      if (method === "work/tasks/list") {
        return {
          task_runs: [{
            id: taskId || "task-existing",
            chat_id: taskId || "task-existing",
            title: "Review pull request",
            status: "running",
            created_at_ms: 1_700_000_000_000,
          }],
        };
      }
      if (["work/tasks/cancel", "work/tasks/retry", "work/tasks/remove"].includes(method)) {
        return { accepted: true };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [
        "work/tasks/list",
        "work/tasks/create",
        "work/tasks/cancel",
        "work/tasks/retry",
        "work/tasks/remove",
      ],
      transport,
    });
    const capabilities = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    expect(capabilities.capabilities.find((item) => item.id === "work.taskRuns")?.availability).toBe("available");

    const created = await ports.work.createTaskRun({
      title: "Review pull request",
      prompt: "Review this change",
      permissionMode: "plan",
    });
    expect(created).toMatchObject({ id: taskId, title: "Review pull request", status: "running" });
    expect(created.createdAt).toBe("2023-11-14T22:13:20.000Z");
    expect(transport.request).toHaveBeenCalledWith("work/tasks/create", {
      chat_id: taskId,
      task_title: "Review pull request",
      prompt: "Review this change",
      permission: "plan",
    });
    await ports.work.cancelTaskRun(taskId);
    await expect(ports.work.retryTaskRun(taskId)).resolves.toMatchObject({ id: taskId });
    await ports.work.removeTaskRun(taskId);
    expect(transport.request).toHaveBeenCalledWith("work/tasks/cancel", { task_id: taskId });
    expect(transport.request).toHaveBeenCalledWith("work/tasks/retry", { task_id: taskId });
    expect(transport.request).toHaveBeenCalledWith("work/tasks/remove", { task_id: taskId });
  });

  it("keeps Work task runs deferred when any required native RPC is absent", async () => {
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => ["work/tasks/list", "work/tasks/create"],
      transport: mockTransport(),
    });
    const capabilities = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    expect(capabilities.capabilities.find((item) => item.id === "work.taskRuns")?.availability).toBe("deferred");
  });

  it("enables Automations only with every native operation and maps the owner instruction", async () => {
    const automationId = "altai:automation-1";
    const transport = mockTransport(async (method, _params) => {
      if (method === "work/automations/list") {
        return { automations: [] };
      }
      if (method === "work/automations/create" || method === "work/automations/update") {
        return {
          automation: {
            id: automationId,
            chat_id: "chat-1",
            title: "Nightly checks",
            prompt: "Run the test suite",
            schedule: { kind: "every", every_ms: 60_000 },
            enabled: true,
          },
        };
      }
      if (["work/automations/trigger", "work/automations/pause", "work/automations/delete"].includes(method)) {
        return { accepted: true };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [
        "work/automations/list",
        "work/automations/create",
        "work/automations/update",
        "work/automations/trigger",
        "work/automations/pause",
        "work/automations/delete",
      ],
      transport,
    });
    const capabilities = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    expect(capabilities.capabilities.find((item) => item.id === "work.automations")?.availability).toBe("available");

    const createAutomation = ports.work.createAutomation as (input: {
      chatId: string;
      title: string;
      prompt: string;
      schedule: { kind: "every"; everyMs: number };
      enabled: boolean;
    }) => Promise<unknown>;
    await expect(createAutomation({
      chatId: "chat-1",
      title: "Nightly checks",
      prompt: "Run the test suite",
      schedule: { kind: "every", everyMs: 60_000 },
      enabled: true,
    })).resolves.toMatchObject({ id: automationId, chatId: "chat-1", prompt: "Run the test suite" });
    expect(transport.request).toHaveBeenCalledWith("work/automations/create", {
      chat_id: "chat-1",
      title: "Nightly checks",
      prompt: "Run the test suite",
      schedule: { kind: "every", every_ms: 60_000 },
    });

    await ports.work.triggerAutomation(automationId);
    await ports.work.pauseAutomation(automationId);
    await ports.work.deleteAutomation(automationId);
    expect(transport.request).toHaveBeenCalledWith("work/automations/trigger", { automation_id: automationId });
    expect(transport.request).toHaveBeenCalledWith("work/automations/pause", { automation_id: automationId });
    expect(transport.request).toHaveBeenCalledWith("work/automations/delete", { automation_id: automationId });
  });

  it("keeps Automations deferred when a native lifecycle method is absent", async () => {
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => ["work/automations/list", "work/automations/create"],
      transport: mockTransport(),
    });
    const capabilities = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    expect(capabilities.capabilities.find((item) => item.id === "work.automations")?.availability).toBe("deferred");
  });

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
      if (method === "run/retry") {
        return { run_id: "run_2" };
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
    expect(byId["runtime.retryRun"]).toBe("available");
    expect(byId["runtime.queueRun"]).toBe("available");
    expect(byId["sessions.create"]).toBe("available");

    const ref = await ports.runtime.startRun({
      prompt: "hello",
      permissionMode: "auto-edit",
      attachments: [{
        uri: "vscode-remote://ssh-remote+dev/workspace/diagram.png",
        name: "diagram.png",
        mimeType: "image/png",
      }],
    });
    expect(ref.runId).toBe("run_1");
    expect(ref.chatId).toMatch(/^chat_/);
    expect(transport.request).toHaveBeenCalledWith(
      "sessions/create",
      expect.objectContaining({ chat_id: ref.chatId }),
    );
    expect(transport.request).toHaveBeenCalledWith(
      "run/start",
      expect.objectContaining({
        chat_id: ref.chatId,
        prompt: "hello",
        permission: "auto-edit",
        attachments: [{
          uri: "vscode-remote://ssh-remote+dev/workspace/diagram.png",
          name: "diagram.png",
          mimeType: "image/png",
        }],
      }),
    );

    await ports.runtime.startRun({ prompt: "queued", queue: true });
    expect(transport.request).toHaveBeenCalledWith(
      "run/start",
      expect.objectContaining({ prompt: "queued", queue: true }),
    );

    await expect(
      ports.runtime.retryRun({ chatId: ref.chatId, runId: ref.runId }),
    ).resolves.toEqual({ chatId: ref.chatId, runId: "run_2" });
    expect(transport.request).toHaveBeenCalledWith("run/retry", {
      chat_id: ref.chatId,
      run_id: ref.runId,
    });
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
        return { model: "openai/gpt-test", permission: "auto-edit" };
      }
      if (method === "context/compact") {
        return { accepted: true };
      }
      if (method === "clarification/respond") {
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
    expect(byId["interactive.approval"]).toBe("available");
    expect(byId["interactive.clarification"]).toBe("available");
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
    transport.request.mockImplementationOnce(async (method) => {
      if (method === "checkpoints/list") {
        return {
          checkpoints: [
            {
              id: "checkpoint_2",
              path: "/workspace/a.ts",
              label: "edit_file",
              created_ms: 1_700_000_000_100,
            },
          ],
        };
      }
      throw new Error(`unexpected native method ${method}`);
    });
    await expect(ports.review.listCheckpoints("chat_1")).resolves.toEqual([
      {
        id: "checkpoint_2",
        chatId: "chat_1",
        label: "/workspace/a.ts · edit_file",
        createdAt: "2023-11-14T22:13:20.100Z",
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
    await expect(ports.settings.setPermissionMode("auto-edit")).resolves.toBe("auto-edit");
    expect(transport.request).toHaveBeenCalledWith("config/update", {
      permission: "auto-edit",
    });
    await expect(ports.settings.setPermissionMode("bypass")).rejects.toThrow(
      /permission_bypass_requires_confirmation/,
    );
    await ports.runtime.compactContext({ chatId: "chat_1" });
    expect(transport.request).toHaveBeenCalledWith("context/compact", {
      chat_id: "chat_1",
    });
    await ports.runtime.respondToClarification({
      chatId: "chat_1",
      ticketId: "ticket_1",
      action: "dismiss",
    });
    expect(transport.request).toHaveBeenCalledWith("clarification/respond", {
      chat_id: "chat_1",
      action: "dismiss",
    });
    await ports.runtime.respondToApproval({
      chatId: "chat_1",
      runId: "run_1",
      approvalId: "approval_1",
      decision: "approve",
    });
    expect(transport.request).toHaveBeenCalledWith("clarification/respond", {
      chat_id: "chat_1",
      action: "reply",
      text: "approve",
    });
    expect(transport.requestWorkspace).toHaveBeenCalledWith("searchFiles", {
      query: "a.ts",
    });
  });

  it("loads native transcripts and truncates only at a user-turn boundary", async () => {
    const transport = mockTransport(async (method) => {
      if (method === "sessions/messages") {
        return {
          messages: [
            { id: "user:1", role: "user", content: "Keep this" },
            { id: "message:2", role: "assistant", content: "Discard this" },
          ],
        };
      }
      if (method === "sessions/truncate") {
        return { deleted_messages: 1 };
      }
      throw new Error(`unexpected native method ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [
        "sessions/messages",
        "sessions/truncate",
      ],
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
    expect(byId["sessions.messages"]).toBe("available");
    expect(byId["sessions.truncate"]).toBe("available");

    await expect(ports.sessions.listMessages("chat_1")).resolves.toEqual([
      expect.objectContaining({ id: "user:1", role: "user", content: "Keep this" }),
      expect.objectContaining({ id: "message:2", role: "assistant", content: "Discard this" }),
    ]);
    await ports.sessions.truncateSession("chat_1", "user:1");
    expect(transport.request).toHaveBeenCalledWith("sessions/truncate", {
      chat_id: "chat_1",
      keep_user_messages: 1,
    });
    await ports.sessions.truncateSession("chat_1", "user:0");
    expect(transport.request).toHaveBeenCalledWith("sessions/truncate", {
      chat_id: "chat_1",
      keep_user_messages: 0,
    });
    await expect(
      ports.sessions.truncateSession("chat_1", "message:2"),
    ).rejects.toThrow(/session_truncate_requires_user_message/);
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

  it("routes provider connection actions without forwarding a credential reference", async () => {
    const transport = mockTransport(async (method, params) => {
      if (method === "providers/status") {
        return {
          providers: [
            { provider_id: "openai", label: "Configured provider", connected: true },
          ],
        };
      }
      if (method === "providers/connect") {
        expect(params).toEqual({
          provider_id: "openai",
          base_url: "https://relay.example/v1",
        });
        return { provider_id: "openai", connected: true };
      }
      if (method === "providers/clear") {
        expect(params).toEqual({ provider_id: "openai" });
        return { provider_id: "openai", cleared: true };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [
        "providers/status",
        "providers/connect",
        "providers/clear",
      ],
      transport,
    });
    const caps = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    expect(
      caps.capabilities.find((capability) => capability.id === "settings.providerStatus")
        ?.availability,
    ).toBe("available");
    await expect(ports.settings.getProviderStatus()).resolves.toEqual([
      { providerId: "openai", label: "Configured provider", connected: true },
    ]);
    await ports.settings.beginProviderConnection({
      providerId: "openai",
      secretRef: "never-forwarded-to-native",
      baseUrl: "https://relay.example/v1",
    });
    await ports.settings.clearProviderCredential("openai");
  });

  it("routes durable session metadata controls only when advertised", async () => {
    const transport = mockTransport(async (method) => {
      if (method === "sessions/rename") {
        return {
          chat_id: "chat_1",
          title: "Renamed",
          archived: false,
          updated_at_ms: 1_700_000_000_000,
        };
      }
      if (method === "sessions/archive" || method === "sessions/delete") {
        return { accepted: true };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [
        "sessions/rename",
        "sessions/archive",
        "sessions/delete",
      ],
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
    expect(byId["sessions.rename"]).toBe("available");
    expect(byId["sessions.archive"]).toBe("available");
    expect(byId["sessions.delete"]).toBe("available");
    await expect(ports.sessions.renameSession("chat_1", "Renamed")).resolves.toEqual({
      id: "chat_1",
      title: "Renamed",
      updatedAt: "2023-11-14T22:13:20.000Z",
      archived: false,
    });
    await ports.sessions.archiveSession("chat_1");
    await ports.sessions.deleteSession("chat_1");
    expect(transport.request).toHaveBeenCalledWith("sessions/archive", { chat_id: "chat_1" });
    expect(transport.request).toHaveBeenCalledWith("sessions/delete", { chat_id: "chat_1" });
  });

  it("applies and denies edit proposals only when native review methods exist", async () => {
    const transport = mockTransport(async (method) => {
      if (method === "review/proposals/apply" || method === "review/proposals/deny") {
        return { ok: true };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [
        "review/proposals/apply",
        "review/proposals/deny",
      ],
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
    expect(byId["review.editProposal"]).toBe("available");

    await ports.review.applyEditProposal("msg-1", {
      path: "src/a.ts",
      kind: "edit_file",
      originalContent: "a",
      proposedContent: "b",
    });
    await ports.review.denyEditProposal("msg-2");
    expect(transport.request).toHaveBeenCalledWith("review/proposals/apply", {
      id: "msg-1",
      path: "src/a.ts",
      kind: "edit_file",
      original_content: "a",
      proposed_content: "b",
    });
    expect(transport.request).toHaveBeenCalledWith("review/proposals/deny", {
      id: "msg-2",
    });

    const locked = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => ["checkpoints/list"],
      transport: mockTransport(),
    });
    await expect(
      locked.review.applyEditProposal("x", { path: "a", proposedContent: "b" }),
    ).rejects.toThrow(/capability_unavailable|review\/proposals\/apply/);
  });

  it("lists skills when native skills/list is advertised", async () => {
    const transport = mockTransport(async (method) => {
      if (method === "skills/list") {
        return {
          skills: [
            { name: "review", description: "PR review", enabled: true },
            { name: "draft", description: null },
          ],
        };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => ["skills/list"],
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
    expect(byId["skills.list"]).toBe("available");
    await expect(ports.mcpSkills.listSkills()).resolves.toEqual([
      { name: "review", description: "PR review", enabled: true },
      { name: "draft", description: null },
    ]);
  });

  it("installs skills when native skills/install is advertised", async () => {
    const transport = mockTransport(async (method, params) => {
      if (method === "skills/install") {
        expect(params).toEqual({ source: "owner/repo", skill: "demo" });
        return {
          skills: [{ name: "demo", description: "Demo skill", enabled: true }],
          installed: ["demo"],
        };
      }
      throw new Error(`unexpected ${method}`);
    });
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => ["skills/install"],
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
    expect(byId["skills.install"]).toBe("available");
    await expect(ports.mcpSkills.installSkill("owner/repo#demo")).resolves.toEqual({
      name: "demo",
      description: "Demo skill",
      enabled: true,
    });
  });
});
