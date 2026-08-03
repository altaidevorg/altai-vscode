import { describe, expect, it } from "vitest";
import { createVsCodeHostPorts } from "../../src/webview/host/createVsCodeHostPorts.js";

describe("createVsCodeHostPorts", () => {
  it("initializes with VS Code host metadata and gates chat capabilities", async () => {
    const ports = createVsCodeHostPorts({ hostVersion: "0.1.0" });
    const caps = await ports.runtime.initialize({
      protocolMin: 1,
      protocolMax: 1,
      clientName: "test",
      clientVersion: "0.1.0",
    });
    expect(caps.hostName).toBe("altai-vscode");
    expect(caps.hostVersion).toBe("0.1.0");
    expect(caps.protocolVersion).toBe(1);

    const byId = Object.fromEntries(
      caps.capabilities.map((c) => [c.id, c.availability]),
    );
    expect(byId["runtime.initialize"]).toBe("available");
    expect(byId["runtime.startRun"]).toBe("deferred");
    expect(byId["sessions.list"]).toBe("deferred");
    expect(byId["desktop.studioWindow"]).toBe("unsupported");
  });

  it("rejects startRun until the chat vertical slice lands", async () => {
    const ports = createVsCodeHostPorts();
    await expect(
      ports.runtime.startRun({
        prompt: "hello",
      }),
    ).rejects.toThrow(/runtime\.startRun/);
  });
});
