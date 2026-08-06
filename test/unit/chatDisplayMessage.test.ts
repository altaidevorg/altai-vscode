import { describe, expect, it } from "vitest";
import {
  appendUserMessage,
  applyAgentEventToMessages,
  displayMessagesFromSession,
  shouldShowChatEmptyHome,
  extractToolFileTarget,
  pathToFileUri,
  textFromAgentEvent,
} from "../../src/webview/chatDisplayMessage.js";
import type { AgentEvent } from "@altai/host-contract";
import { createVsCodeHostPorts } from "../../src/webview/host/createVsCodeHostPorts.js";
import { vi } from "vitest";

describe("displayMessagesFromSession", () => {
  it("keeps user/assistant roles only", () => {
    const messages = displayMessagesFromSession([
      { id: "1", role: "system", content: "sys" },
      { id: "2", role: "user", content: "  hi  " },
      { id: "3", role: "tool", content: "t" },
      { id: "4", role: "assistant", content: "hello" },
    ]);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[0]?.content).toBe("hi");
  });

  it("treats only user/assistant as conversation content", () => {
    expect(shouldShowChatEmptyHome([])).toBe(true);
    expect(
      shouldShowChatEmptyHome([
        { id: "m", role: "meta", content: "status" },
      ]),
    ).toBe(true);
    expect(
      shouldShowChatEmptyHome([
        { id: "u", role: "user", content: "hi" },
      ]),
    ).toBe(false);
  });
});

describe("applyAgentEventToMessages", () => {
  it("coalesces streaming assistant deltas", () => {
    const e1: AgentEvent = {
      type: "message",
      chatId: "c1",
      runId: "r1",
      seq: 1,
      payload: { type: "agent_message", role: "assistant", content: "Hel" },
    };
    const e2: AgentEvent = {
      type: "message",
      chatId: "c1",
      runId: "r1",
      seq: 2,
      payload: { type: "agent_message", role: "assistant", content: "lo" },
    };
    let next = applyAgentEventToMessages([], e1, { activeChatId: "c1" });
    next = applyAgentEventToMessages(next, e2, { activeChatId: "c1" });
    expect(next).toHaveLength(1);
    expect(next[0]?.content).toBe("Hello");
    expect(next[0]?.streaming).toBe(true);
  });

  it("ignores events for other chats", () => {
    const base = appendUserMessage([], "hi");
    const event: AgentEvent = {
      type: "message",
      chatId: "other",
      runId: "r1",
      seq: 1,
      payload: { type: "agent_message", content: "nope" },
    };
    expect(
      applyAgentEventToMessages(base, event, { activeChatId: "c1" }),
    ).toEqual(base);
  });

  it("reads nested agent_message text", () => {
    const event: AgentEvent = {
      type: "message",
      chatId: "c1",
      runId: "r1",
      seq: 1,
      payload: {
        type: "agent_message",
        role: "assistant",
        content: "nested ok",
      },
    };
    expect(textFromAgentEvent(event)).toEqual({
      role: "assistant",
      text: "nested ok",
      done: false,
    });
  });

  it("maps tool starts with file path metadata", () => {
    const event: AgentEvent = {
      type: "tool",
      chatId: "c1",
      runId: "r1",
      seq: 3,
      payload: {
        type: "tool_call_start",
        name: "edit",
        input: { path: "/Users/me/proj/src/App.tsx" },
      },
    };
    const next = applyAgentEventToMessages([], event, { activeChatId: "c1" });
    expect(next).toHaveLength(1);
    expect(next[0]?.role).toBe("tool");
    expect(next[0]?.toolName).toBe("edit");
    expect(next[0]?.filePath).toBe("/Users/me/proj/src/App.tsx");
    expect(next[0]?.fileUri).toBe("file:///Users/me/proj/src/App.tsx");
    expect(next[0]?.content).toContain("App.tsx");
  });
});

describe("extractToolFileTarget", () => {
  it("finds nested path and builds file URIs", () => {
    expect(
      extractToolFileTarget({
        event: { input: { file_path: "/tmp/a.ts" } },
      }),
    ).toEqual({
      path: "/tmp/a.ts",
      uri: "file:///tmp/a.ts",
    });
    expect(pathToFileUri("/tmp/x.ts")).toBe("file:///tmp/x.ts");
  });
});

describe("mapRunEvent via subscribe", () => {
  it("maps nested agent_message envelopes to message events", () => {
    let listener: ((n: { method: string; params?: unknown }) => void) | null =
      null;
    const transport = {
      request: vi.fn(async () => ({})),
      requestWorkspace: vi.fn(async () => ({})),
      onNotification: vi.fn((fn) => {
        listener = fn;
        return () => {
          listener = null;
        };
      }),
    };
    const ports = createVsCodeHostPorts({
      isHostReady: () => true,
      getNativeCapabilities: () => [],
      transport,
    });
    const seen: AgentEvent[] = [];
    ports.events.subscribe((event) => {
      seen.push(event);
    });
    listener?.({
      method: "run/event",
      params: {
        version: 1,
        scope: "run",
        runId: "run-1",
        seq: 2,
        chatId: "chat-1",
        event: {
          content: "hello",
          role: "assistant",
          type: "agent_message",
        },
      },
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.type).toBe("message");
    expect(seen[0]?.chatId).toBe("chat-1");
    expect(seen[0]?.runId).toBe("run-1");
    expect(textFromAgentEvent(seen[0]!)?.text).toBe("hello");
  });
});
