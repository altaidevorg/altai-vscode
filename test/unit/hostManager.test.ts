import { PassThrough } from "node:stream";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeFrame } from "../../src/extension/rpc/frameCodec.js";
import { HostDiagnosticCode } from "../../src/extension/host/HostDiagnostics.js";
import { HostManager } from "../../src/extension/host/HostManager.js";
import type { HostProcessFactory } from "../../src/extension/host/HostProcess.js";
import { AGENT_HOST_PATH_ENV } from "../../src/extension/host/HostResolver.js";

const managers: HostManager[] = [];

afterEach(() => {
  for (const manager of managers.splice(0)) {
    manager.dispose();
  }
});

function createFakeBinary(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "altai-host-"));
  const exe = path.join(dir, "fake-host");
  writeFileSync(exe, "#!/bin/sh\nexit 0\n", "utf8");
  chmodSync(exe, 0o755);
  return exe;
}

function mockProcessFactory(options?: {
  crashAfterMs?: number;
  protocolMax?: number;
}): HostProcessFactory {
  return () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    let exitListener:
      | ((code: number | null, signal: NodeJS.Signals | null) => void)
      | undefined;

    stdin.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      if (!text.includes('"method":"initialize"')) {
        return;
      }
      const idMatch = /"id"\s*:\s*(\d+)/.exec(text);
      const id = idMatch ? Number(idMatch[1]) : 1;
      const protocolMax = options?.protocolMax ?? 1;
      stdout.write(
        encodeFrame(
          Buffer.from(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              result: {
                protocol_min: 1,
                protocol_max: protocolMax,
                capabilities: ["stdio.serve"],
              },
            }),
            "utf8",
          ),
        ),
      );
    });

    if (options?.crashAfterMs !== undefined) {
      setTimeout(() => {
        exitListener?.(1, null);
      }, options.crashAfterMs);
    }

    return {
      stdin,
      stdout,
      stderr,
      pid: 4242,
      kill: () => {
        exitListener?.(0, "SIGTERM");
        return true;
      },
      onExit: (listener) => {
        exitListener = listener;
        return () => {
          if (exitListener === listener) {
            exitListener = undefined;
          }
        };
      },
    };
  };
}

describe("HostManager", () => {
  it("refuses spawn when workspace is untrusted", async () => {
    const statuses: string[] = [];
    const manager = new HostManager({
      extensionPath: "/tmp/ext",
      getWorkspaceRoot: () => "/tmp/ws",
      isTrusted: () => false,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory(),
      onStatus: (s) => statuses.push(s.status),
      env: { [AGENT_HOST_PATH_ENV]: createFakeBinary() },
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLifecycleState()).toBe("Error");
    expect(manager.getLastDiagnostic()?.code).toBe(HostDiagnosticCode.Untrusted);
    expect(manager.getStatus().diagnosticCode).toBe(HostDiagnosticCode.Untrusted);
  });

  it("reports no workspace folder", async () => {
    const manager = new HostManager({
      extensionPath: "/tmp/ext",
      getWorkspaceRoot: () => undefined,
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory(),
      env: { [AGENT_HOST_PATH_ENV]: createFakeBinary() },
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLifecycleState()).toBe("Error");
    expect(manager.getLastDiagnostic()?.code).toBe(
      HostDiagnosticCode.NoWorkspace,
    );
  });

  it("re-reads workspace root on restart after a folder is opened", async () => {
    let root: string | undefined;
    const manager = new HostManager({
      extensionPath: "/tmp/ext",
      getWorkspaceRoot: () => root,
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory(),
      env: { [AGENT_HOST_PATH_ENV]: createFakeBinary() },
      initializeTimeoutMs: 2_000,
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLastDiagnostic()?.code).toBe(
      HostDiagnosticCode.NoWorkspace,
    );
    root = "/tmp/ws";
    await manager.restart();
    expect(manager.getLifecycleState()).toBe("Ready");
  });

  it("skips restart when already ready for the same workspace root", async () => {
    const logs: string[] = [];
    const manager = new HostManager({
      extensionPath: "/tmp/ext",
      getWorkspaceRoot: () => "/tmp/ws",
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory(),
      env: { [AGENT_HOST_PATH_ENV]: createFakeBinary() },
      initializeTimeoutMs: 2_000,
      log: (line) => logs.push(line),
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLifecycleState()).toBe("Ready");
    await manager.restart();
    expect(manager.getLifecycleState()).toBe("Ready");
    expect(logs.some((line) => line.includes("restart skipped"))).toBe(true);
  });

  it("reports missing binary", async () => {
    const manager = new HostManager({
      extensionPath: "/tmp/ext-missing",
      getWorkspaceRoot: () => "/tmp/ws",
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory(),
      env: { [AGENT_HOST_PATH_ENV]: "/definitely/missing/altai-host" },
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLastDiagnostic()?.code).toBe(HostDiagnosticCode.Missing);
  });

  it("reaches Ready and then records crash", async () => {
    const manager = new HostManager({
      extensionPath: "/tmp/ext",
      getWorkspaceRoot: () => "/tmp/ws",
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory({ crashAfterMs: 30 }),
      env: { [AGENT_HOST_PATH_ENV]: createFakeBinary() },
      initializeTimeoutMs: 2_000,
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLifecycleState()).toBe("Ready");

    await vi.waitFor(() => {
      expect(manager.getLifecycleState()).toBe("Error");
      expect(manager.getLastDiagnostic()?.code).toBe(HostDiagnosticCode.Crashed);
    });
  });

  it("restart sequence returns to Ready", async () => {
    const manager = new HostManager({
      extensionPath: "/tmp/ext",
      getWorkspaceRoot: () => "/tmp/ws",
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory(),
      env: { [AGENT_HOST_PATH_ENV]: createFakeBinary() },
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLifecycleState()).toBe("Ready");
    await manager.restart();
    expect(manager.getLifecycleState()).toBe("Ready");
    expect(manager.getCapabilities()).toContain("stdio.serve");
  });

  it("marks incompatible protocol", async () => {
    const manager = new HostManager({
      extensionPath: "/tmp/ext",
      getWorkspaceRoot: () => "/tmp/ws",
      isTrusted: () => true,
      extensionVersion: "0.1.0",
      processFactory: mockProcessFactory({ protocolMax: 0 }),
      env: { [AGENT_HOST_PATH_ENV]: createFakeBinary() },
    });
    managers.push(manager);

    await manager.start();
    expect(manager.getLastDiagnostic()?.code).toBe(
      HostDiagnosticCode.Incompatible,
    );
  });
});
